import type { ScoreResult, WordResult } from '../../types';

/** LLM only REFINES the local verdict — it never replaces it outright. */
export interface LLMScore {
  total: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  words?: { word: string; status: string }[];
  advice?: string;
}

const VALID = new Set(['ok', 'off', 'miss', 'extra']);

export function parseStrictJson(raw: string): unknown | null {
  try {
    let s = (raw || '').trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return JSON.parse(s.slice(start, end + 1));
  } catch { return null; }
}

export function validateScore(raw: string): LLMScore | null {
  const v = parseStrictJson(raw) as Record<string, unknown> | null;
  if (!v || typeof v !== 'object') return null;
  const num = (x: unknown, fallback: number): number =>
    typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : fallback;
  if (typeof v.total !== 'number') return null;
  const out: LLMScore = {
    total: num(v.total, 0),
    accuracy: num(v.accuracy, 0),
    fluency: num(v.fluency, 0),
    completeness: num(v.completeness, 0),
  };
  if (Array.isArray(v.words)) {
    out.words = v.words
      .filter((w): w is { word: string; status: string } =>
        !!w && typeof w === 'object' && typeof (w as any).word === 'string' && VALID.has((w as any).status))
      .slice(0, 80);
  }
  if (typeof v.advice === 'string' && v.advice.length > 3 && v.advice.length < 220) out.advice = v.advice;
  return out;
}

function blend(local: number, remote: number): number {
  // Drift guard: >25 points apart -> weighted average instead of trusting the model.
  return Math.abs(remote - local) > 25
    ? Math.round(local * 0.5 + remote * 0.5)
    : Math.round(remote);
}

function levelOf(total: number): ScoreResult['level'] {
  if (total >= 90) return 'Excellent';
  if (total >= 75) return 'Good job';
  if (total >= 60) return 'Keep going';
  return 'Try again';
}

export function mergeScore(local: ScoreResult, llm: LLMScore): ScoreResult {
  const total = blend(local.total, llm.total);
  let words: WordResult[] = local.words;
  if (llm.words?.length) {
    const byWord = new Map(llm.words.map((w) => [w.word.toLowerCase().replace(/[^a-z']/g, ''), w.status]));
    words = local.words.map((w) => {
      const st = byWord.get(w.word.toLowerCase().replace(/[^a-z']/g, ''));
      return st && VALID.has(st) ? { ...w, status: st as WordResult['status'] } : w;
    });
  }
  return {
    ...local,
    total,
    accuracy: blend(local.accuracy, llm.accuracy),
    fluency: blend(local.fluency, llm.fluency),
    completeness: blend(local.completeness, llm.completeness),
    level: levelOf(total),
    words,
    advice: llm.advice || local.advice,
    engine: 'api',
  };
}

/** For TASK B (follow-up) replies. */
export function validateFollowUp(raw: string): { reply: string; question: string } | null {
  const v = parseStrictJson(raw) as Record<string, unknown> | null;
  if (!v || typeof v.reply !== 'string' || typeof v.question !== 'string') return null;
  const q = v.question.trim();
  // Enforce Upper Bloom's: never let a yes/no question through.
  if (!/^\s*(why|how)\b/i.test(q)) return null;
  return { reply: v.reply.trim().slice(0, 220), question: q };
}
