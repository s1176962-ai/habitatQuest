import type { WordTiming } from '../types';

/** System voices only — no webfonts, no remote audio, no CDN. */
export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  try { return speechSynthesis.getVoices().filter((v) => /^en(-|_)/i.test(v.lang)); }
  catch { return []; }
}

export function pickEnglishVoice(preferred?: string): SpeechSynthesisVoice | undefined {
  const all = englishVoices();
  if (preferred && preferred !== 'default') {
    const exact = all.find((v) => v.name === preferred);
    if (exact) return exact;
  }
  return all.find((v) => /en-US/i.test(v.lang)) || all.find((v) => /en-GB/i.test(v.lang)) || all[0];
}

export interface SpeakHandle { stop: () => void }

export function speak(
  text: string,
  opts: {
    rate?: number;
    voice?: string;
    onBoundary?: (charIndex: number) => void;
    onEnd?: () => void;
    onError?: () => void;
  } = {},
): SpeakHandle {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    setTimeout(() => opts.onError?.(), 0);
    return { stop: () => {} };
  }
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = opts.rate ?? 1;
  u.pitch = 1.02;
  const v = pickEnglishVoice(opts.voice);
  if (v) u.voice = v;
  let finished = false;
  const finish = (ok: boolean) => {
    if (finished) return;
    finished = true;
    if (ok) opts.onEnd?.(); else opts.onError?.();
  };
  u.onboundary = (e) => {
    if (e.name === 'word' || typeof e.charIndex === 'number') opts.onBoundary?.(e.charIndex ?? 0);
  };
  u.onend = () => finish(true);
  u.onerror = () => finish(false);
  try { window.speechSynthesis.speak(u); } catch { finish(false); }
  // Chrome sometimes pauses long utterances; keep it alive.
  const keepAlive = window.setInterval(() => {
    if (finished) { window.clearInterval(keepAlive); return; }
    try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch { /* ignore */ }
  }, 3000);
  return {
    stop: () => {
      window.clearInterval(keepAlive);
      if (!finished) { finished = true; try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
    },
  };
}

export function playAudioUrl(
  url: string,
  opts: {
    rate?: number;
    onTime?: (seconds: number, duration: number) => void;
    onEnd?: () => void;
    onError?: () => void;
  } = {},
): SpeakHandle {
  const audio = new Audio(url);
  audio.playbackRate = opts.rate ?? 1;
  audio.preload = 'auto';
  audio.ontimeupdate = () => opts.onTime?.(audio.currentTime, audio.duration || 0);
  audio.onended = () => opts.onEnd?.();
  audio.onerror = () => opts.onError?.();
  audio.play().catch(() => opts.onError?.());
  return {
    stop: () => { audio.pause(); audio.src = ''; },
  };
}

/** Cut at a sentence end; used for the 240-char single-TTS cap. */
export function truncateToSentence(text: string, max = 240): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (stop > max * 0.5) return slice.slice(0, stop + 1).trim();
  const space = slice.lastIndexOf(' ');
  return (space > 0 ? slice.slice(0, space) : slice).trim();
}

export function estimateTokens(text: string): number { return Math.ceil(text.length / 4); }

/** Map a charIndex (SpeechSynthesis boundary) to a token index. */
export function charIndexToWord(text: string, charIndex: number): number {
  const upto = text.slice(0, charIndex);
  return Math.max(0, upto.trim().split(/\s+/).filter(Boolean).length - (/\s$/.test(upto) ? 0 : 1));
}

/** Fall back to proportional timing when an STT response has no word timings. */
export function approximateTimings(words: string[], durationSec: number): WordTiming[] {
  const step = durationSec / Math.max(1, words.length);
  return words.map((w, i) => ({ word: w, start: i * step, end: (i + 1) * step }));
}

export function wordAtTime(timings: WordTiming[] | undefined, seconds: number): number {
  if (!timings?.length) return -1;
  for (let i = timings.length - 1; i >= 0; i--) if (seconds >= timings[i].start) return i;
  return -1;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      resolve(s.slice(s.indexOf(',') + 1));
    };
    r.onerror = () => reject(new Error('audio read failed'));
    r.readAsDataURL(blob);
  });
}

export function revoke(url: string | null | undefined): void {
  if (url && url.startsWith('blob:')) { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function safeContext(): { isFileProtocol: boolean; micAvailable: boolean } {
  const isFileProtocol = typeof location !== 'undefined' && location.protocol === 'file:';
  const micAvailable = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && (typeof window === 'undefined' || window.isSecureContext);
  return { isFileProtocol, micAvailable };
}
