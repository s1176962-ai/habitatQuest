import type { Msg, ProviderAdapter, TTSResult, TranscriptResult } from '../types';
import { t } from '../i18n';
import { blobToBase64, estimateTokens, truncateToSentence } from '../lib/audio';
import { getConfig } from '../lib/storage';
import { LIMITS } from '../lib/quota';
import { NetworkError, networkRequest, reportUsage } from '../lib/network';

/**
 * Gemini REST adapter. Uses the x-goog-api-key HEADER (never ?key= in the URL,
 * which would leak the credential into query strings and logs).
 *
 * TTS is provided by the browser's SpeechSynthesis: Gemini's TTS endpoint is a
 * different API shape, and a silent, keyless fallback keeps the loop unbroken.
 * This is documented in the README rather than hidden.
 */
function pathFor(model: string): string {
  return `models/${encodeURIComponent(model)}:generateContent`;
}

function bodyFor(messages: Msg[], maxTokens: number) {
  const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  return {
    ...(sys ? { system_instruction: { parts: [{ text: sys }] } } : {}),
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0, responseMimeType: 'text/plain' },
  };
}

function textOf(data: unknown): string {
  const d = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return d.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}
function usageOf(data: unknown) {
  const d = data as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
  const u = d.usageMetadata;
  return u ? { prompt: u.promptTokenCount || 0, completion: u.candidatesTokenCount || 0 } : undefined;
}

/** Returns an i18n key — the request log resolves it at render time. */
function purposeOf(messages: Msg[]): string {
  const sys = messages.find((m) => m.role === 'system')?.content || '';
  if (sys.includes('TASK A')) return 'log.purpose.scoreGemini';
  if (sys.includes('TASK B')) return 'log.purpose.questionGemini';
  return 'log.purpose.testGemini';
}

export const geminiProvider: ProviderAdapter = {
  id: 'gemini',

  async tts(text, opts): Promise<TTSResult> {
    // Deliberate: browser speech, no network request, no extra quota.
    return { mode: 'speech', text: truncateToSentence(text, LIMITS.SINGLE.ttsChars), rate: opts.rate };
  },

  async stt(blob: Blob): Promise<TranscriptResult> {
    const c = getConfig();
    const data = await blobToBase64(blob);
    const body = {
      contents: [{
        role: 'user',
        parts: [
          { text: 'Transcribe this short English sentence spoken by a child. Return ONLY the transcript text, no quotes, no explanation.' },
          { inline_data: { mime_type: blob.type || 'audio/webm', data } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 120 },
    };
    const { response } = await networkRequest(
      pathFor(c.sttModel || c.model),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      { purpose: 'log.purpose.sttGemini', kind: 'stt', amount: 10, channel: 'api', authStyle: 'x-goog-api-key' },
    );
    if (!response.ok) throw new NetworkError(t('err.sttFail'));
    return { text: textOf(await response.json()).trim() };
  },

  async chat(messages, opts) {
    const c = getConfig();
    const maxTokens = Math.min(opts.maxTokens, LIMITS.SINGLE.scoreMaxTokens);
    const estimated = estimateTokens(messages.map((m) => m.content).join(' ')) + maxTokens;
    const { response, logId } = await networkRequest(
      pathFor(c.model),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyFor(messages, maxTokens)),
      },
      {
        purpose: purposeOf(messages), kind: 'chat', amount: estimated, channel: 'api',
        authStyle: 'x-goog-api-key', timeoutMs: opts.timeoutMs ?? LIMITS.SINGLE.timeoutMs,
      },
    );
    if (!response.ok) throw new NetworkError(t('err.modelFail'));
    const raw = await response.json();
    const usage = usageOf(raw);
    if (usage) reportUsage(logId, usage, estimated);
    return { content: textOf(raw), usage };
  },
  // image(): not exposed for Gemini in this prototype; local SVGs are used.
};
