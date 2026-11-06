import type { ProviderAdapter, TTSResult, HabitatId } from '../types';
import { truncateToSentence } from '../lib/audio';
import { takeLocalTranscript } from '../lib/speech';
import { parseStrictJson } from '../lib/scoring/refine';
import { isCausalQuestion, nextQuestion } from '../mock/questionBank';
import { partnerReply, evaluateAnswer } from '../mock/partner';
import { CARDS } from '../mock/cards';

/**
 * Channel A — zero network requests, zero cost, works with the wifi unplugged.
 * TTS = SpeechSynthesis, STT = browser SpeechRecognition (or typed fallback),
 * scoring = pure local alignment, follow-ups = built-in Why/How bank.
 */
export const localProvider: ProviderAdapter = {
  id: 'local',

  async tts(text, opts): Promise<TTSResult> {
    return {
      mode: 'speech',
      text: truncateToSentence(text, 240),
      rate: opts.rate,
    };
  },

  async stt() {
    return takeLocalTranscript();
  },

  async chat(messages) {
    // TASK A (pronunciation) is done by localScore() in the app — no LLM here.
    const sys = messages.find((m) => m.role === 'system')?.content || '';
    if (sys.includes('TASK B')) {
      const raw = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      const payload = parseStrictJson(raw) as {
        habitat?: HabitatId; cardId?: string; answer?: string; animal?: string;
      } | null;
      const habitat: HabitatId = payload?.habitat || 'forest';
      const card = CARDS.find((c) => c.id === payload?.cardId) || CARDS[0];
      const answer = payload?.answer || '';
      let q = nextQuestion(habitat, card.id);
      if (!isCausalQuestion(q)) q = nextQuestion(habitat, card.id);
      const reply = partnerReply(card, answer, evaluateAnswer(q, answer, card));
      return { content: JSON.stringify({ reply, question: q }) };
    }
    return { content: '' };
  },
  // image(): intentionally absent — offline cards come from src/assets/cards.
};

