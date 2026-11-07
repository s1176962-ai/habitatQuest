import type { Channel, ChatUsage, Config, RequestLogEntry } from '../types';
import { t } from '../i18n';
import { getConfig, readKey, readRequestLog, writeRequestLog } from './storage';
import { LIMITS, consume, correctUsage, precheck, type QuotaKind } from './quota';

/**
 * THE ONLY PLACE IN src/ THAT IS ALLOWED TO TALK TO THE NETWORK.
 *
 * Responsibilities:
 *  (a) verify the destination is exactly the user's own Base URL
 *  (b) pre-deduct quota and hard-block over-limit calls
 *  (c) append every request to the visible "network request list"
 *  (d) never let Authorization (or the key) reach a log, error or URL query
 *
 * In local channel nothing ever reaches this module: 0 outgoing requests.
 */
const PROXY_ORIGIN = 'http://127.0.0.1:8787';

export class QuotaError extends Error {
  constructor(message: string) { super(message); this.name = 'QuotaError'; }
}
export class NetworkError extends Error {
  corsLikely: boolean;
  constructor(message: string, corsLikely = false) { super(message); this.name = 'NetworkError'; this.corsLikely = corsLikely; }
}
export class DomainError extends Error {
  constructor() { super(t('err.domain')); this.name = 'DomainError'; }
}

let log: RequestLogEntry[] = readRequestLog();
let logSnapshot: RequestLogEntry[] = log;
const listeners = new Set<() => void>();
let nextId = log.reduce((m, e) => Math.max(m, e.id), 0) + 1;

function emitLog(): void {
  logSnapshot = [...log];
  writeRequestLog(log);
  listeners.forEach((l) => l());
}
export function subscribeNetwork(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export function getNetworkLogSnapshot(): RequestLogEntry[] { return logSnapshot; }
export function clearNetworkLog(): void { log = []; emitLog(); }
export function networkLogCount(): number { return log.length; }

/** All external domains this app will contact with the current settings. */
export function externalDomains(config: Config = getConfig()): string[] {
  if (config.channel === 'local') return [];
  try {
    const host = new URL(config.baseUrl).host;
    if (config.proxyMode) return [`${PROXY_ORIGIN.replace('http://', '')} → ${host}`];
    return [host];
  } catch { return []; }
}

/** Resolved at call time; callers subscribe with useI18n() so the switch
 *  re-renders them. Keys are not stored here because {domain} is dynamic. */
export function domainStatusText(config: Config = getConfig()): string {
  if (config.channel === 'local') return t('net.localStatus');
  const d = externalDomains(config)[0];
  return d ? t('net.apiStatus', { domain: d }) : t('net.apiNoDomain');
}

function clock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function addEntry(e: Omit<RequestLogEntry, 'id' | 'time'>): number {
  const id = nextId++;
  log = [...log, { id, time: clock(), ...e }].slice(-60);
  emitLog();
  return id;
}
function patchEntry(id: number, patch: Partial<RequestLogEntry>): void {
  log = log.map((e) => (e.id === id ? { ...e, ...patch } : e));
  emitLog();
}

export interface NetworkOptions {
  purpose: string;
  kind: QuotaKind;
  /** chars (tts) / seconds (stt) / estimated tokens (chat) / 1 (image) */
  amount: number;
  channel: Channel;
  authStyle?: 'bearer' | 'x-goog-api-key';
  timeoutMs?: number;
  signal?: AbortSignal;
  note?: string;
}

export interface NetworkResult { response: Response; logId: number }

/** Replace direct calls when a CORS failure is detected. Runner: scripts/local-proxy.mjs */
export function proxyCommand(config: Config = getConfig()): string {
  const q = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  const isWin = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform);
  const keyPlaceholder = t('set.proxyKeyPlaceholder');
  return isWin
    ? `set HQ_TARGET_BASE_URL=${q(config.baseUrl)} && set HQ_API_KEY=${q(keyPlaceholder)} && node scripts/local-proxy.mjs`
    : `HQ_TARGET_BASE_URL=${q(config.baseUrl)} HQ_API_KEY=${q(keyPlaceholder)} node scripts/local-proxy.mjs`;
}

export async function networkRequest(
  path: string,
  init: RequestInit,
  opts: NetworkOptions,
): Promise<NetworkResult> {
  const config = getConfig();
  const channel = opts.channel;
  let base: URL;
  let dest: URL;
  try {
    base = new URL(config.baseUrl.replace(/\/+$/, '') + '/');
    dest = new URL(path.replace(/^\/+/, ''), base);
  } catch {
    throw new NetworkError(t('err.baseUrl'));
  }
  // Hard domain whitelist — the app cannot be pointed anywhere else at runtime.
  if (dest.origin !== base.origin) throw new DomainError();

  const gate = precheck(opts.kind, opts.amount, channel);
  if (!gate.ok) {
    addEntry({
      domain: dest.host, purpose: opts.purpose, promptTokens: 0, completionTokens: 0,
      status: 'net.status.blocked', ok: false, channel,
      note: gate.reasonKey ?? gate.reason, noteVars: gate.reasonVars,
    });
    throw new QuotaError(gate.reason || t('quota.usedUp'));
  }

  const headers = new Headers(init.headers || {});
  // Key goes ONLY into a request header, only to the whitelisted origin,
  // and only when we are not using the key-less localhost relay.
  if (!config.proxyMode) {
    const key = readKey();
    if (key) {
      if (opts.authStyle === 'x-goog-api-key') headers.set('x-goog-api-key', key);
      else headers.set('Authorization', `Bearer ${key}`);
    }
  }

  const finalUrl = config.proxyMode
    ? `${PROXY_ORIGIN}/${path.replace(/^\/+/, '')}`
    : dest.toString();
  const displayDomain = config.proxyMode
    ? `127.0.0.1:8787 → ${dest.host}`
    : dest.host;

  const estTokens = opts.kind === 'chat' ? opts.amount : 0;
  const logId = addEntry({
    domain: displayDomain,
    purpose: opts.purpose,
    promptTokens: estTokens,
    completionTokens: 0,
    status: 'net.status.pending',
    ok: false,
    channel,
    note: opts.note || (config.proxyMode ? 'net.note.proxy' : 'net.note.direct'),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? LIMITS.SINGLE.timeoutMs);
  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const response = await fetch(finalUrl, { ...init, headers, signal: controller.signal });
    patchEntry(logId, { status: String(response.status), ok: response.ok });
    consume(opts.kind, opts.amount, channel);
    return { response, logId };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    patchEntry(logId, { status: aborted ? 'net.status.timeout' : 'net.status.neterr', ok: false });
    // Generic messages only — never interpolate the key or the raw error body.
    throw new NetworkError(aborted ? t('err.timeout') : t('err.cors'), !aborted);
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }
}

/** Replace an estimated token count with the provider's real usage. */
export function reportUsage(logId: number, usage: ChatUsage, estimatedTokens: number): void {
  patchEntry(logId, { promptTokens: usage.prompt, completionTokens: usage.completion });
  correctUsage(estimatedTokens, usage);
}

/** Called by providers when a non-chat call needs a visible completion-side value. */
export function reportNote(logId: number, note: string): void { patchEntry(logId, { note }); }
