import type { TranscriptResult } from '../types';

/**
 * Browser SpeechRecognition wrapper for the LOCAL channel.
 *
 * Privacy note: Chrome's webkitSpeechRecognition may be implemented by the
 * browser vendor using its own network service. This app itself makes zero
 * fetch() calls in local mode (see the Network Request List), but we say so
 * honestly in the README and offer a typed-transcript fallback that works
 * fully offline — required for classrooms with no internet.
 */
interface SRAlternative { transcript: string; confidence: number }
interface SRResult { isFinal: boolean; 0: SRAlternative; length: number }
interface SRResultList { length: number; [i: number]: SRResult }
interface SREvent { resultIndex: number; results: SRResultList }
interface SRInstance extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SRConstructor = new () => SRInstance;

declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

export function recognitionAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

let pending: TranscriptResult = { text: '' };
export function setLocalTranscript(t: TranscriptResult): void { pending = t; }
export function takeLocalTranscript(): TranscriptResult {
  const t = pending;
  pending = { text: '' };
  return t;
}

export interface RecognitionHandle {
  stop: () => void;
  abort: () => void;
}

/** Collect final results during a push-to-talk recording. */
export function startSpeechRecognition(onInterim?: (text: string) => void): RecognitionHandle | null {
  if (!recognitionAvailable() || typeof window === 'undefined') return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  let rec: SRInstance;
  try { rec = new Ctor(); } catch { return null; }
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  const finals: string[] = [];
  let confSum = 0, confCount = 0;
  let stopped = false;

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const alt = r[0];
      if (!alt) continue;
      if (r.isFinal) {
        finals.push(alt.transcript.trim());
        confSum += alt.confidence || 0.85;
        confCount++;
      } else interim += alt.transcript;
    }
    if (interim.trim()) onInterim?.(interim.trim());
  };
  rec.onerror = () => { /* surfaced by the UI as "没听清，再试一次" */ };
  rec.onend = () => {
    if (stopped) return;
    stopped = true;
    setLocalTranscript({
      text: finals.join(' ').trim(),
      confidence: confCount ? confSum / confCount : undefined,
    });
  };
  try { rec.start(); } catch { return null; }

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      setLocalTranscript({
        text: finals.join(' ').trim(),
        confidence: confCount ? confSum / confCount : undefined,
      });
      try { rec.stop(); } catch { /* ignore */ }
    },
    abort: () => { stopped = true; try { rec.abort(); } catch { /* ignore */ } },
  };
}
