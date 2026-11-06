import type { Msg, ProviderAdapter, ProviderId, TTSResult, TranscriptResult, WordTiming } from '../types';
import { blobToBase64, estimateTokens, truncateToSentence } from '../lib/audio';
import { getConfig } from '../lib/storage';
import { LIMITS } from '../lib/quota';
import { NetworkError, networkRequest, reportUsage } from '../lib/network';

function chatPurpose(messages: Msg[]): string {
  const sys = messages.find((m) => m.role === 'system')?.content || '';
  if (sys.includes('TASK A')) return '发音判分 (LLM refinement)';
  if (sys.includes('TASK B')) return '生成 Why/How 追问';
  return '测试连接';
}

function b64ToObjectUrl(b64: string, mime = 'image/png'): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/** Channel B, OpenAI-compatible REST. Every request goes through network.ts. */
export function createOpenAICompatible(id: ProviderId = 'openai-compatible'): ProviderAdapter {
  const isGeminiLike = id === 'gemini';
  return {
    id,

    async tts(text, opts): Promise<TTSResult> {
      const c = getConfig();
      const safe = truncateToSentence(text, LIMITS.SINGLE.ttsChars);
      const body = {
        model: c.ttsModel,
        input: safe,
        voice: opts.voice || c.ttsVoice || 'alloy',
        speed: opts.rate,
      };
      const { response } = await networkRequest(
        'audio/speech',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        { purpose: 'TTS 示范', kind: 'tts', amount: safe.length, channel: 'api', timeoutMs: LIMITS.SINGLE.timeoutMs },
      );
      if (!response.ok) throw new NetworkError('语音合成失败，已降级到浏览器朗读。');
      const blob = await response.blob();
      if (!blob.size) throw new NetworkError('语音合成为空，已降级到浏览器朗读。');
      return { mode: 'audio', text: safe, rate: opts.rate, audioUrl: URL.createObjectURL(blob) };
    },

    async stt(blob: Blob): Promise<TranscriptResult> {
      const c = getConfig();
      const fd = new FormData();
      fd.append('file', blob, blob.type.includes('mp4') ? 'audio.m4a' : 'audio.webm');
      fd.append('model', c.sttModel);
      fd.append('response_format', 'verbose_json');
      fd.append('timestamp_granularities[]', 'word');
      // No Content-Type header: the browser must set the multipart boundary.
      const { response } = await networkRequest(
        'audio/transcriptions',
        { method: 'POST', body: fd },
        { purpose: '语音识别 (STT)', kind: 'stt', amount: 10, channel: 'api', timeoutMs: LIMITS.SINGLE.timeoutMs },
      );
      if (!response.ok) throw new NetworkError('语音识别失败，已降级到本地识别。');
      const data = await response.json() as {
        text?: string;
        words?: { word: string; start: number; end: number }[];
      };
      const words: WordTiming[] | undefined = Array.isArray(data.words)
        ? data.words.map((w) => ({ word: w.word, start: Number(w.start) || 0, end: Number(w.end) || 0 }))
        : undefined;
      return { text: (data.text || '').trim(), words };
    },

    async chat(messages, opts) {
      const c = getConfig();
      const maxTokens = Math.min(opts.maxTokens, LIMITS.SINGLE.scoreMaxTokens);
      const estimated = estimateTokens(messages.map((m) => m.content).join(' ')) + maxTokens;
      const body = {
        model: c.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0,
      };
      const { response, logId } = await networkRequest(
        'chat/completions',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        {
          purpose: chatPurpose(messages), kind: 'chat', amount: estimated,
          channel: 'api', timeoutMs: opts.timeoutMs ?? LIMITS.SINGLE.timeoutMs,
          authStyle: isGeminiLike ? 'x-goog-api-key' : 'bearer',
        },
      );
      if (!response.ok) throw new NetworkError('模型请求失败，已降级到本地结果。');
      const data = await response.json() as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage
        ? { prompt: data.usage.prompt_tokens || 0, completion: data.usage.completion_tokens || 0 }
        : undefined;
      if (usage) reportUsage(logId, usage, estimated);
      return { content, usage };
    },

    async image(prompt: string): Promise<string> {
      const c = getConfig();
      const body = {
        model: 'gpt-image-1',
        prompt: prompt.slice(0, 400),
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      };
      const { response } = await networkRequest(
        'images/generations',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        { purpose: '生成图片卡', kind: 'image', amount: 1, channel: 'api', timeoutMs: 30000 },
      );
      if (!response.ok) throw new NetworkError('图片生成失败，已回落到本地插画。');
      const data = await response.json() as { data?: { b64_json?: string }[] };
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new NetworkError('图片生成未返回本地可用数据，已回落到本地插画。');
      return b64ToObjectUrl(b64);
    },
  };
}

/** Used by the Gemini adapter to embed audio as inline data. */
export async function audioInline(blob: Blob): Promise<{ mimeType: string; data: string }> {
  return { mimeType: blob.type || 'audio/webm', data: await blobToBase64(blob) };
}
