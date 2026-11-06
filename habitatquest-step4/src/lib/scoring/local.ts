import type { ScoreResult, WordResult, WordTiming } from '../../types';
import { GENERIC_HINT, hintFor } from '../../mock/phonemeHints';

/**
 * Pure, offline pronunciation proxy.
 *
 * HONEST SCOPE: this measures transcript alignment (understandability and
 * read-aloud accuracy) plus recognition confidence — NOT acoustic/phoneme-level
 * assessment. See README. No network calls, no audio persistence.
 */

const CONTRACTIONS: Record<string, string> = {
  "it's": 'it is', "that's": 'that is', "there's": 'there is', "he's": 'he is', "she's": 'she is',
  "can't": 'cannot', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "won't": 'will not',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "hasn't": 'has not', "haven't": 'have not',
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "let's": 'let us',
  "i've": 'i have', "it'll": 'it will', "you'll": 'you will', "we'll": 'we will',
};
const NUMBERS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
};
const SPELLING: Record<string, string> = {
  colour: 'color', colours: 'colors', centre: 'center', favourite: 'favorite',
  behaviour: 'behavior', organisation: 'organization', realise: 'realize',
  grey: 'gray', travelling: 'traveling', modelling: 'modeling',
};
const FILLERS = new Set(['um', 'uh', 'er', 'erm', 'ah', 'hmm']);

export function normalize(text: string): string {
  let s = (text || '').toLowerCase().replace(/[’‘]/g, "'");
  s = s.replace(/[^a-z0-9'\s-]/g, ' ');
  let parts = s.split(/\s+/).filter(Boolean);
  parts = parts.map((w) => CONTRACTIONS[w] || w);
  const expanded = parts.join(' ').split(/\s+/).filter(Boolean);
  return expanded.map((w) => NUMBERS[w] || SPELLING[w] || w).join(' ');
}

export function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
}

export type AlignOp = { type: 'match' | 'sub' | 'miss' | 'extra'; t?: string; r?: string };

/** Weighted edit-distance alignment with fuzzy substitution. */
export function alignWords(target: string[], recognized: string[]): AlignOp[] {
  const n = target.length, m = recognized.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const choice: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) { dp[i][0] = i; choice[i][0] = 1; }
  for (let j = 1; j <= m; j++) { dp[0][j] = j * 0.9; choice[0][j] = 2; }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = similarity(target[i - 1], recognized[j - 1]);
      const diag = dp[i - 1][j - 1] + (sim === 1 ? 0 : sim >= 0.62 ? 0.45 : 1.1);
      const up = dp[i - 1][j] + 1;
      const left = dp[i][j - 1] + 0.9;
      const best = Math.min(diag, up, left);
      dp[i][j] = best;
      choice[i][j] = best === diag ? 0 : best === up ? 1 : 2;
    }
  }
  const rev: AlignOp[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const c = choice[i][j];
    if (i > 0 && j > 0 && c === 0) {
      const same = target[i - 1] === recognized[j - 1];
      rev.push({ type: same ? 'match' : 'sub', t: target[i - 1], r: recognized[j - 1] });
      i--; j--;
    } else if (i > 0 && (j === 0 || c === 1)) {
      rev.push({ type: 'miss', t: target[i - 1] }); i--;
    } else {
      rev.push({ type: 'extra', r: recognized[j - 1] }); j--;
    }
  }
  return rev.reverse();
}

function clamp(v: number, lo = 0, hi = 100): number { return Math.max(lo, Math.min(hi, v)); }

function levelOf(total: number): ScoreResult['level'] {
  if (total >= 90) return 'Excellent';
  if (total >= 75) return 'Good job';
  if (total >= 60) return 'Keep going';
  return 'Try again';
}

export interface LocalScoreInput {
  target: string;
  transcript: string;
  confidence?: number;
  words?: WordTiming[];
  durationSec: number;
  keywords?: string[];
}

export function localScore(input: LocalScoreInput): ScoreResult {
  const t = tokenize(input.target);
  const r = tokenize(input.transcript);
  const ops = alignWords(t, r);
  const matched = ops.filter((o) => o.type === 'match').length;
  const subs = ops.filter((o) => o.type === 'sub').length;
  const missing = ops.filter((o) => o.type === 'miss').length;
  const extras = ops.filter((o) => o.type === 'extra').length;
  const n = Math.max(1, t.length);

  // 1) accuracy: matched-word share (with partial credit for near matches) + recognition confidence
  const conf = clamp(input.confidence ?? 0.85, 0, 1);
  const accuracy = clamp(100 * (((matched + 0.45 * subs) / n) * 0.7 + conf * 0.3));

  // 2) completeness: matched words, minus 8 points per missing keyword capsule
  const normTranscript = normalize(input.transcript);
  const missedKeywords = (input.keywords || []).filter((k) => !normTranscript.includes(normalize(k)));
  const completeness = clamp((matched / n) * 100 - missedKeywords.length * 8);

  // 3) fluency: WPM, long pauses, filler words
  const duration = Math.max(0.6, input.durationSec || 1);
  const wpm = Math.round((r.length / duration) * 60);
  let fluency = 100;
  if (wpm < 90) fluency -= Math.min(45, (90 - wpm) * 0.5);
  else if (wpm > 150) fluency -= Math.min(35, (wpm - 150) * 0.35);
  let longPauses = 0;
  if (input.words && input.words.length > 1) {
    for (let i = 1; i < input.words.length; i++) {
      if (input.words[i].start - input.words[i - 1].end > 0.8) longPauses++;
    }
  }
  fluency -= Math.min(21, longPauses * 7);
  const fillers = r.filter((w) => FILLERS.has(w)).length;
  fluency -= Math.min(15, fillers * 5);
  fluency = clamp(fluency, 20, 100);

  // 4) unified score
  const total = Math.round(accuracy * 0.5 + fluency * 0.25 + completeness * 0.25);

  const words: WordResult[] = ops.map((o) => {
    if (o.type === 'extra') return { word: o.r || '', status: 'extra' as const };
    const w = o.t || '';
    if (o.type === 'match') return { word: w, status: 'ok' as const };
    const h = hintFor(w) || GENERIC_HINT;
    return { word: w, status: o.type === 'sub' ? 'off' as const : 'miss' as const, ipa: h.ipa, hint: h.tip };
  });

  const off = words.filter((w) => w.status === 'off').map((w) => w.word);
  const miss = words.filter((w) => w.status === 'miss').map((w) => w.word);
  const extra = words.filter((w) => w.status === 'extra').map((w) => w.word);
  let advice: string;
  if (off.length || miss.length) {
    const first = off[0] || miss[0];
    const h = hintFor(first) || GENERIC_HINT;
    advice = `试试把 "${first}" 的 ${h.ipa} 读清楚`;
    if (miss.length) advice += `；另外 "${miss.slice(0, 2).join('"、"')}" 漏读了`;
    advice += '。';
  } else if (extra.length) {
    advice = `读得很完整！注意别多加 "${extra[0]}"，句子会更自然。`;
  } else {
    advice = '读得很完整！可以再注意语速和连读，让句子更自然。';
  }

  return {
    total, accuracy: Math.round(accuracy), fluency: Math.round(fluency),
    completeness: Math.round(completeness), level: levelOf(total), words,
    transcript: input.transcript.trim(), advice, engine: 'local', wpm,
    durationSec: Math.round(duration * 10) / 10,
  };
}

export function keywordHits(transcript: string, keywords: string[]): string[] {
  const n = normalize(transcript);
  return keywords.filter((k) => n.includes(normalize(k)));
}
