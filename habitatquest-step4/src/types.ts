/* Shared types — HabitatQuest Speaking Practice (local-only prototype) */

/** UI language. English is the default; the choice is persisted in Config. */
export type Lang = 'en' | 'zh';
export type I18nVars = Record<string, string | number>;
/** A translatable fragment. Stored instead of a finished string so an
 *  already-rendered value can follow a language switch. */
export interface I18nPiece { key: string; vars?: I18nVars }

export type Phase =
  | 'card' | 'listening' | 'recording' | 'scoring'
  | 'feedback' | 'question' | 'answering' | 'wrap';

export const PHASES: Phase[] = [
  'card', 'listening', 'recording', 'scoring',
  'feedback', 'question', 'answering', 'wrap',
];

/** Values are i18n keys, resolved with t() at render time. */
export const PHASE_LABEL: Record<Phase, string> = {
  card: 'phase.card', listening: 'phase.listening', recording: 'phase.recording', scoring: 'phase.scoring',
  feedback: 'phase.feedback', question: 'phase.question', answering: 'phase.answering', wrap: 'phase.wrap',
};

export type HabitatId = 'polar' | 'ocean' | 'desert' | 'savanna' | 'forest' | 'wetland';
export type ProviderId = 'local' | 'openai-compatible' | 'gemini' | 'custom';
export type Channel = 'local' | 'api';
export type Player = 'A' | 'B';

export interface CardData {
  id: string;
  animal: string;
  chineseName: string;
  habitat: HabitatId;
  habitatLabel: string;
  color: string;
  illustration: string;
  difficulty: 1 | 2 | 3;
  target: string;
  keywords: string[];
  adaptation: string;
  imagePrompt: string;
}

export interface WordTiming { word: string; start: number; end: number }

export interface WordResult {
  word: string;
  status: 'ok' | 'off' | 'miss' | 'extra';
  hint?: string;
  ipa?: string;
}

export interface ScoreResult {
  total: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  level: 'Excellent' | 'Good job' | 'Keep going' | 'Try again';
  words: WordResult[];
  transcript: string;
  advice: string;
  /** Preferred render path for locally generated advice (follows language). */
  adviceI18n?: I18nPiece[];
  engine: 'local' | 'api';
  wpm: number;
  durationSec: number;
}

export interface TranscriptResult {
  text: string;
  confidence?: number;
  words?: WordTiming[];
}

export interface TTSResult {
  mode: 'speech' | 'audio';
  text: string;
  rate: number;
  audioUrl?: string;
  words?: WordTiming[];
}

export interface Msg { role: 'system' | 'user' | 'assistant'; content: string }

export interface ChatUsage { prompt: number; completion: number }

export interface ProviderAdapter {
  id: ProviderId;
  tts(text: string, opts: { rate: number; voice?: string }): Promise<TTSResult>;
  stt(blob: Blob): Promise<TranscriptResult>;
  chat(messages: Msg[], opts: { maxTokens: number; timeoutMs: number }): Promise<{ content: string; usage?: ChatUsage }>;
  image?(prompt: string): Promise<string>;
}

export interface Prices {
  promptPer1k: number;      // CNY / 1k prompt tokens
  completionPer1k: number;  // CNY / 1k completion tokens
  ttsPer1kChars: number;
  sttPerMinute: number;
  imageEach: number;
}

export interface Config {
  channel: Channel;
  provider: ProviderId;
  baseUrl: string;
  model: string;
  ttsModel: string;
  ttsVoice: string;
  sttModel: string;
  rate: number;
  keyStoreMode: 'session' | 'local';
  proxyMode: boolean;
  aiImages: boolean;
  noSaveAudio: boolean;
  duo: boolean;
  theme: 'light' | 'dark';
  /** UI language, persisted with the rest of the non-secret settings. */
  language: Lang;
  /** Focus mode: hide the left/right rails so only the practice stage remains. */
  compactRails: boolean;
  /** Show the small bottom-right network pill. The full panel is always reachable from the top bar. */
  showNetworkPanel: boolean;
  prices: Prices;
}

export interface LearningRecord {
  t: number;
  round: number;
  cardId: string;
  animal: string;
  habitat: HabitatId;
  total: number;
  missedWords: string[];
  player: Player;
}

export interface ChatBubble {
  id: number;
  who: 'pip' | 'me' | 'note';
  text: string;
  /** Optional annotation below the bubble; an i18n key or plain text. */
  note?: string;
  /** Preferred render path for note bubbles (follows language switches). */
  textI18n?: I18nPiece[];
}

export interface RequestLogEntry {
  id: number;
  time: string;
  domain: string;
  purpose: string;
  promptTokens: number;
  completionTokens: number;
  status: string;
  ok: boolean;
  channel: Channel;
  /** i18n key (or a plain string); resolved with tr() at render time. */
  note?: string;
  noteVars?: I18nVars;
}

export interface RoundCounters {
  reRecord: number;
  relisten: number;
  scoring: number;
  question: number;
  answerScoring: number;
}

export interface SessionCounters {
  llmCalls: number;
  ttsChars: number;
  sttSeconds: number;
  tokens: number;
  images: number;
  dialogRounds: number;
  apiCalls: number;
  costCny: number;
}

export interface QuotaState {
  round: number;                 // 1..8
  perRound: RoundCounters;
  session: SessionCounters;
  daily: { apiCalls: number; costCny: number; date: string };
}

export interface AnswerEval {
  answered: boolean;
  usedCausal: boolean;
  longEnough: boolean;
  wordCount: number;
  fillerCount: number;
  /** Kept for compatibility; the UI rebuilds the sentence from the fields above. */
  summary: string;
}

export interface RecordedTake {
  blob: Blob | null;
  url: string | null;
  durationSec: number;
  transcript: string;
  confidence?: number;
  words?: WordTiming[];
  source: 'mic' | 'file' | 'typed';
}
