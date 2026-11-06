import type { Channel, QuotaState } from '../types';
import { getConfig } from './storage';

/**
 * Client-side cost guardrails. NOT a security boundary — see README.
 * 3 layers: single-call, per-round / per-session, per-day (local-time midnight).
 */
export const LIMITS = {
  MAX_ROUNDS: 8,
  PER_ROUND: { reRecord: 3, relisten: 2, scoring: 1, question: 1, answerScoring: 1 },
  SESSION: { llmCalls: 20, ttsChars: 3000, tokens: 12000, images: 2, dialogRounds: 8 },
  DAILY: { apiCalls: 60, costCny: 5 },
  SINGLE: {
    ttsChars: 240,
    recordSec: 10,
    silenceSec: 1.2,
    scoreMaxTokens: 250,
    questionMaxTokens: 120,
    timeoutMs: 15000,
    maxImageSize: 1024,
  },
} as const;

export type QuotaKind =
  | 'tts' | 'stt' | 'chat' | 'image'
  | 'relisten' | 'reRecord' | 'scoring' | 'question' | 'answerScoring';

const KIND_LABEL: Record<QuotaKind, string> = {
  tts: '语音合成', stt: '语音识别', chat: '模型调用', image: '图片生成',
  relisten: '重听', reRecord: '重录', scoring: '判分', question: '追问', answerScoring: '回答评价',
};

function localDateKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const DAILY_PREFIX = 'hq4:quota:';

function loadDaily(): { apiCalls: number; costCny: number; date: string } {
  const date = localDateKey();
  try {
    const raw = localStorage.getItem(DAILY_PREFIX + date);
    if (raw) {
      const p = JSON.parse(raw) as { apiCalls: number; costCny: number };
      return { apiCalls: p.apiCalls || 0, costCny: p.costCny || 0, date };
    }
  } catch { /* storage blocked */ }
  return { apiCalls: 0, costCny: 0, date };
}
function persistDaily(d: QuotaState['daily']): void {
  try {
    localStorage.setItem(DAILY_PREFIX + d.date, JSON.stringify({ apiCalls: d.apiCalls, costCny: d.costCny }));
  } catch { /* storage blocked */ }
}

function blankRound(): QuotaState['perRound'] {
  return { reRecord: 0, relisten: 0, scoring: 0, question: 0, answerScoring: 0 };
}
function blankSession(): QuotaState['session'] {
  return { llmCalls: 0, ttsChars: 0, sttSeconds: 0, tokens: 0, images: 0, dialogRounds: 0, apiCalls: 0, costCny: 0 };
}
function freshState(): QuotaState {
  return { round: 1, perRound: blankRound(), session: blankSession(), daily: loadDaily() };
}

let state: QuotaState = freshState();
let snapshot: QuotaState = clone(state);
const listeners = new Set<() => void>();

function clone(s: QuotaState): QuotaState {
  return { round: s.round, perRound: { ...s.perRound }, session: { ...s.session }, daily: { ...s.daily } };
}
function emit(persist = true): void {
  // Rotate the daily bucket at local midnight even if the tab stays open.
  if (state.daily.date !== localDateKey()) state.daily = loadDaily();
  snapshot = clone(state);
  if (persist) persistDaily(state.daily);
  listeners.forEach((l) => l());
}

export function subscribeQuota(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getQuotaSnapshot(): QuotaState { return snapshot; }
export function getQuota(): QuotaState { return clone(state); }

export function estimateTokens(text: string): number { return Math.ceil(text.length / 4); }

/** Reference pricing only — user-editable, never queried online. */
export function estimateCost(kind: QuotaKind, amount: number): number {
  const p = getConfig().prices;
  switch (kind) {
    case 'tts': return (amount / 1000) * p.ttsPer1kChars;
    case 'stt': return (amount / 60) * p.sttPerMinute;
    case 'image': return p.imageEach;
    case 'chat': return (amount / 1000) * (p.promptPer1k + p.completionPer1k) / 2;
    default: return 0;
  }
}

export interface CheckResult { ok: boolean; reason?: string }

/** Called BEFORE every metered call. Returns a friendly Chinese reason on block. */
export function precheck(kind: QuotaKind, amount: number, channel: Channel = 'api'): CheckResult {
  if (state.daily.date !== localDateKey()) { state.daily = loadDaily(); emit(false); }

  // Per-round interaction caps apply to BOTH channels (they shape the exercise).
  if ((kind === 'relisten' || kind === 'reRecord') && state.perRound[kind] >= LIMITS.PER_ROUND[kind]) {
    return { ok: false, reason: `本轮「${KIND_LABEL[kind]}」已用完（上限 ${LIMITS.PER_ROUND[kind]} 次），可以继续下一步。` };
  }
  if (kind === 'scoring' && channel === 'api' && state.perRound.scoring >= LIMITS.PER_ROUND.scoring) {
    return { ok: false, reason: '本轮 AI 判分次数已用完（1 次）；可切换本地通道继续练习。' };
  }
  if (kind === 'question' && channel === 'api' && state.perRound.question >= LIMITS.PER_ROUND.question) {
    return { ok: false, reason: '本轮追问次数已用完（1 次）。' };
  }
  if (kind === 'answerScoring' && channel === 'api' && state.perRound.answerScoring >= LIMITS.PER_ROUND.answerScoring) {
    return { ok: false, reason: '本轮回答评价次数已用完（1 次）。' };
  }

  // From here on: only API channel consumes real quota. Local stays free.
  if (channel === 'local') return { ok: true };
  if (!getConfig().baseUrl) return { ok: false, reason: '请先在设置里填写 Base URL。' };

  const s = state.session;
  if (kind === 'tts') {
    if (amount > LIMITS.SINGLE.ttsChars) return { ok: false, reason: `单次 TTS 文本超过 ${LIMITS.SINGLE.ttsChars} 字符。` };
    if (s.ttsChars + amount > LIMITS.SESSION.ttsChars) return { ok: false, reason: '本会话 TTS 字符已达 3,000 上限，可切回本地通道。' };
  }
  if (kind === 'image' && s.images >= LIMITS.SESSION.images) {
    return { ok: false, reason: '本会话图片生成已达 2 张上限，已回落到本地插画。' };
  }
  if (kind === 'chat') {
    if (s.llmCalls >= LIMITS.SESSION.llmCalls) return { ok: false, reason: '本会话 LLM 调用已达 20 次上限。' };
    if (s.tokens + amount > LIMITS.SESSION.tokens) return { ok: false, reason: '本会话估算 token 已达 12,000 上限，API 通道已停用，请切回本地通道。' };
  }
  if (state.daily.apiCalls >= LIMITS.DAILY.apiCalls) {
    return { ok: false, reason: '今日 API 调用已达 60 次上限（本机按日期计）。' };
  }
  if (state.daily.costCny + estimateCost(kind, amount) > LIMITS.DAILY.costCny) {
    return { ok: false, reason: '今日估算费用已达 ¥5.00 上限。' };
  }
  return { ok: true };
}

/** Called AFTER a successful call. `realTokens` overrides the estimate. */
export function consume(kind: QuotaKind, amount: number, channel: Channel = 'api', realTokens?: number): void {
  const p = state.perRound;
  if (kind in p) p[kind as keyof typeof p] += 1;

  if (kind === 'tts' && channel === 'api') state.session.ttsChars += amount;
  if (kind === 'stt' && channel === 'api') state.session.sttSeconds += amount;
  if (kind === 'image' && channel === 'api') state.session.images += 1;
  if (kind === 'chat' && channel === 'api') {
    state.session.llmCalls += 1;
    state.session.tokens += realTokens ?? amount;
  }
  if (channel === 'api') {
    state.session.apiCalls += 1;
    state.daily.apiCalls += 1;
    const cost = estimateCost(kind, realTokens ?? amount);
    state.session.costCny += cost;
    state.daily.costCny += cost;
  }
  emit();
}

/** Correct an estimate with the provider's real usage numbers. */
export function correctUsage(estimatedTokens: number, real: { prompt: number; completion: number }): void {
  const realTotal = real.prompt + real.completion;
  state.session.tokens = Math.max(0, state.session.tokens - estimatedTokens + realTotal);
  const p = getConfig().prices;
  const estCost = (estimatedTokens / 1000) * (p.promptPer1k + p.completionPer1k) / 2;
  const realCost = (real.prompt / 1000) * p.promptPer1k + (real.completion / 1000) * p.completionPer1k;
  state.session.costCny = Math.max(0, state.session.costCny - estCost + realCost);
  state.daily.costCny = Math.max(0, state.daily.costCny - estCost + realCost);
  emit();
}

export function nextRound(): void {
  state.round = Math.min(LIMITS.MAX_ROUNDS, state.round + 1);
  state.perRound = blankRound();
  state.session.dialogRounds += 1;
  emit();
}
export function resetSessionCounters(): void {
  state = freshState();
  emit();
}
export function canStartRound(): boolean { return state.round <= LIMITS.MAX_ROUNDS && state.session.dialogRounds < LIMITS.SESSION.dialogRounds; }

export interface UsageItem { label: string; used: number; limit: number; unit: string; percent: number }
export interface UsageSummary {
  percent: number; remainingTokens: number; estCostCny: number;
  round: number; items: UsageItem[]; dominant: string; level: 'ok' | 'warn' | 'danger';
}

/** Drives the always-visible usage meter in the top bar. */
export function usageSummary(): UsageSummary {
  const s = state.session;
  const raw: UsageItem[] = [
    { label: '对话轮数', used: state.round - 1, limit: LIMITS.MAX_ROUNDS, unit: '轮', percent: 0 },
    { label: 'TTS 字符', used: s.ttsChars, limit: LIMITS.SESSION.ttsChars, unit: '字', percent: 0 },
    { label: 'STT 秒数', used: Math.round(s.sttSeconds), limit: 80, unit: '秒', percent: 0 },
    { label: 'LLM tokens', used: s.tokens, limit: LIMITS.SESSION.tokens, unit: 'tok', percent: 0 },
    { label: 'LLM 调用', used: s.llmCalls, limit: LIMITS.SESSION.llmCalls, unit: '次', percent: 0 },
    { label: '图片生成', used: s.images, limit: LIMITS.SESSION.images, unit: '张', percent: 0 },
    { label: '今日调用', used: state.daily.apiCalls, limit: LIMITS.DAILY.apiCalls, unit: '次', percent: 0 },
    { label: '今日估算', used: state.daily.costCny, limit: LIMITS.DAILY.costCny, unit: '¥', percent: 0 },
  ];
  raw.forEach((i) => { i.percent = Math.min(1, i.limit ? i.used / i.limit : 0); });
  const dominant = raw.reduce((a, b) => (b.percent > a.percent ? b : a), raw[0]);
  const percent = dominant.percent;
  return {
    percent, dominant: dominant.label,
    remainingTokens: Math.max(0, LIMITS.SESSION.tokens - s.tokens),
    estCostCny: s.costCny,
    round: state.round,
    items: raw,
    level: percent >= 1 ? 'danger' : percent >= 0.8 ? 'warn' : 'ok',
  };
}
