import type { Config, LearningRecord, Prices, ProviderId, RequestLogEntry } from '../types';

/**
 * Everything is local. The key is stored SEPARATELY from config and records,
 * and never copied into records, request logs, errors or URLs.
 *
 * Layout:
 *   hq4:config            localStorage  (non-secret settings)
 *   hq4:key               sessionStorage OR localStorage (user choice)
 *   hq4:records           localStorage  (scores only)
 *   hq4:reqlog            sessionStorage (this session's outgoing requests)
 *   hq4:quota:<date>      localStorage  (daily counters)
 */
const PREFIX = 'hq4:';
const K_CONFIG = PREFIX + 'config';
const K_KEY = PREFIX + 'key';
const K_RECORDS = PREFIX + 'records';
const K_REQLOG = PREFIX + 'reqlog';

// In-memory fallback for environments where Web Storage is blocked.
const memory = new Map<string, string>();

function backend(scope: 'local' | 'session'): Storage | null {
  try {
    return scope === 'local' ? window.localStorage : window.sessionStorage;
  } catch { return null; }
}
function get(scope: 'local' | 'session', key: string): string | null {
  try { return backend(scope)?.getItem(key) ?? memory.get(scope + ':' + key) ?? null; }
  catch { return memory.get(scope + ':' + key) ?? null; }
}
function set(scope: 'local' | 'session', key: string, value: string): void {
  memory.set(scope + ':' + key, value);
  try { backend(scope)?.setItem(key, value); } catch { /* private mode */ }
}
function del(scope: 'local' | 'session', key: string): void {
  memory.delete(scope + ':' + key);
  try { backend(scope)?.removeItem(key); } catch { /* ignore */ }
}

export const DEFAULT_PRICES: Prices = {
  promptPer1k: 0.011,      // reference values only, editable, never fetched online
  completionPer1k: 0.043,
  ttsPer1kChars: 0.11,
  sttPerMinute: 0.10,
  imageEach: 0.28,
};

export const PROVIDER_PRESETS: Record<Exclude<ProviderId, 'local'>, {
  label: string; baseUrl: string; model: string; ttsModel: string; ttsVoice: string; sttModel: string;
}> = {
  'openai-compatible': {
    label: 'OpenAI 兼容',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    ttsModel: 'gpt-4o-mini-tts',
    ttsVoice: 'alloy',
    sttModel: 'gpt-4o-mini-transcribe',
  },
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    ttsModel: '(浏览器内置语音)',
    ttsVoice: 'default',
    sttModel: 'gemini-2.0-flash',
  },
  custom: {
    label: '自定义',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    ttsModel: 'gpt-4o-mini-tts',
    ttsVoice: 'alloy',
    sttModel: 'gpt-4o-mini-transcribe',
  },
};

export const DEFAULT_CONFIG: Config = {
  channel: 'local',
  provider: 'openai-compatible',
  baseUrl: PROVIDER_PRESETS['openai-compatible'].baseUrl,
  model: PROVIDER_PRESETS['openai-compatible'].model,
  ttsModel: PROVIDER_PRESETS['openai-compatible'].ttsModel,
  ttsVoice: PROVIDER_PRESETS['openai-compatible'].ttsVoice,
  sttModel: PROVIDER_PRESETS['openai-compatible'].sttModel,
  rate: 1,
  keyStoreMode: 'session',
  proxyMode: false,
  aiImages: false,
  noSaveAudio: true,
  duo: false,
  theme: 'light',
  compactRails: false,
  showNetworkPanel: true,
  prices: DEFAULT_PRICES,
};

let currentConfig: Config = (() => {
  try {
    const raw = get('local', K_CONFIG);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      ...DEFAULT_CONFIG, ...parsed,
      prices: { ...DEFAULT_PRICES, ...(parsed.prices || {}) },
    } satisfies Config;
  } catch { return { ...DEFAULT_CONFIG }; }
})();

export function getConfig(): Config { return currentConfig; }

export function saveConfig(patch: Partial<Config>): Config {
  currentConfig = { ...currentConfig, ...patch, prices: { ...currentConfig.prices, ...(patch.prices || {}) } };
  // Never serialise the key into config.
  const { ...safe } = currentConfig;
  set('local', K_CONFIG, JSON.stringify(safe));
  return currentConfig;
}

/* ------------------------------- API key -------------------------------- */
export function readKey(): string {
  return get('session', K_KEY) || get('local', K_KEY) || '';
}
export function hasKey(): boolean { return readKey().trim().length > 0; }
export function saveKey(key: string, mode: 'session' | 'local'): void {
  del('session', K_KEY);
  del('local', K_KEY);
  const trimmed = key.trim();
  if (!trimmed) return;
  set(mode === 'session' ? 'session' : 'local', K_KEY, trimmed);
}
export function clearKey(): void { saveKey('', 'session'); }
export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return key.slice(0, 2) + '••••••••';
  return key.slice(0, 3) + '••••••••' + key.slice(-4);
}
export function keyLocation(): 'sessionStorage' | 'localStorage' | '未保存' {
  if (get('session', K_KEY)) return 'sessionStorage';
  if (get('local', K_KEY)) return 'localStorage';
  return '未保存';
}
/** Switch storage mode without ever printing the key. */
export function migrateKey(mode: 'session' | 'local'): void {
  const k = readKey();
  saveKey(k, mode);
}

/* --------------------------- learning records --------------------------- */
export function readRecords(): LearningRecord[] {
  try { return JSON.parse(get('local', K_RECORDS) || '[]') as LearningRecord[]; }
  catch { return []; }
}
export function appendRecord(r: LearningRecord): LearningRecord[] {
  const all = [...readRecords(), r].slice(-200);
  set('local', K_RECORDS, JSON.stringify(all));
  return all;
}
export function clearRecords(): void { del('local', K_RECORDS); }
export function exportRecords(): string {
  // Explicitly record-free of any credential: only scores + config metadata.
  return JSON.stringify({
    app: 'HabitatQuest Step 4', exportedAt: new Date().toISOString(),
    note: 'Local learning records only. No key, no audio, no personal data.',
    records: readRecords(),
  }, null, 2);
}

/* ----------------------------- request log ------------------------------ */
export function readRequestLog(): RequestLogEntry[] {
  try { return JSON.parse(get('session', K_REQLOG) || '[]') as RequestLogEntry[]; }
  catch { return []; }
}
export function writeRequestLog(entries: RequestLogEntry[]): void {
  set('session', K_REQLOG, JSON.stringify(entries.slice(-60)));
}
export function clearRequestLog(): void { del('session', K_REQLOG); }

/* -------------------------------- clear --------------------------------- */
export function clearAll(): void {
  for (const scope of ['local', 'session'] as const) {
    const b = backend(scope);
    if (b) {
      try {
        const doomed: string[] = [];
        for (let i = 0; i < b.length; i++) {
          const k = b.key(i);
          if (k && k.startsWith(PREFIX)) doomed.push(k);
        }
        doomed.forEach((k) => b.removeItem(k));
      } catch { /* ignore */ }
    }
  }
  for (const k of [...memory.keys()]) if (k.includes(PREFIX)) memory.delete(k);
  currentConfig = { ...DEFAULT_CONFIG };
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
