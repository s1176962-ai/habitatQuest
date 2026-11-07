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

/** Max wait for the engine to promote interim hypotheses to final results. */
const FINALISE_GRACE_MS = 900;

let pending: TranscriptResult = { text: '' };
export function setLocalTranscript(t: TranscriptResult): void { pending = t; }
export function takeLocalTranscript(): TranscriptResult {
  const t = pending;
  pending = { text: '' };
  return t;
}

export interface RecognitionHandle {
  /** Ask the engine to stop; final results may still arrive afterwards. */
  stop: () => void;
  /** Discard this recording entirely. */
  abort: () => void;
  /** Wait for the engine to settle, then return the best transcript captured. */
  finish: () => Promise<TranscriptResult>;
}

/** Collect results during a push-to-talk recording. */
export function startSpeechRecognition(onInterim?: (text: string) => void): RecognitionHandle | null {
  if (!recognitionAvailable() || typeof window === 'undefined') return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  let rec: SRInstance;
  try { rec = new Ctor(); } catch { return null; }

  // Practice sentences are always English, whatever language the UI uses.
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  // Start from a clean slate so a previous take can never leak into this one.
  pending = { text: '' };
  let bestText = '';
  let bestConfidence: number | undefined;
  let consumed = false;
  let stopped = false;
  let resolveEnd: (() => void) | null = null;
  const ended = new Promise<void>((resolve) => { resolveEnd = resolve; });
  const settle = () => resolveEnd?.();

  const publish = (text: string, confidence?: number) => {
    if (consumed) return;
    bestText = text;
    bestConfidence = confidence;
    // Keep the live transcript up to date on EVERY event, so a caller that
    // has to read it early still gets something usable.
    pending = { text, confidence };
  };

  rec.onresult = (e) => {
    // Ignore anything the engine sends after the take was already consumed;
    // otherwise a late event could re-open the "Recognising:" line.
    if (consumed) return;
    // Rebuild from the full result list instead of only e.resultIndex. Web
    // Speech keeps earlier finals in e.results while it replaces the trailing
    // interim hypothesis, so rebuilding avoids duplicates. More importantly,
    // the interim text is retained as a usable transcript: on slow / blocked
    // recognition backends Chrome frequently emits ONLY interim results and
    // never promotes them, which used to leave the take completely empty even
    // though the learner could see their words on screen ("Recognising:…").
    const finals: string[] = [];
    let interim = '';
    let confSum = 0, confCount = 0;
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      const alt = r[0];
      if (!alt) continue;
      if (r.isFinal) {
        finals.push(alt.transcript.trim());
        confSum += alt.confidence || 0.85;
        confCount++;
      } else interim += alt.transcript;
    }
    const finalText = finals.join(' ').trim();
    const interimText = interim.trim();
    publish(
      [finalText, interimText].filter(Boolean).join(' ').trim(),
      confCount ? confSum / confCount : undefined,
    );
    // Passing '' clears the "Recognising:" line once everything is final.
    onInterim?.(interimText);
  };

  rec.onerror = () => {
    // Keep whatever was already captured — often a perfectly usable interim
    // hypothesis. The UI offers retry / typed fallback when it is empty.
  };

  rec.onend = () => settle();

  try { rec.start(); } catch { return null; }

  const requestStop = () => {
    if (stopped) return;
    stopped = true;
    // Deliberately NOT snapshotting `finals` or closing the session here:
    // Chrome commonly emits isFinal results *after* stop() and before onend.
    try { rec.stop(); } catch { settle(); }
  };

  return {
    stop: requestStop,
    abort: () => {
      stopped = true;
      bestText = '';
      pending = { text: '' };
      onInterim?.('');
      try { rec.abort(); } catch { /* ignore */ }
      settle();
    },
    finish: async () => {
      requestStop();
      // onend normally fires within a few hundred ms. If the engine never
      // fires it (network error, offline), fall back to the grace timer so
      // the lesson is never stuck waiting on the browser.
      await Promise.race([
        ended,
        new Promise<void>((r) => setTimeout(r, FINALISE_GRACE_MS)),
      ]);
      consumed = true;
      const result = takeLocalTranscript();
      return result.text
        ? result
        : { text: bestText.trim(), confidence: bestConfidence };
    },
  };
}
