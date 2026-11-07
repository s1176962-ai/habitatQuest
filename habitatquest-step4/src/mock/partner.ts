import type { AnswerEval, CardData } from '../types';
import { t } from '../i18n';

export const PARTNER = {
  name: 'Pip',
  tagline: 'Your English buddy · animals and habitats only',
  age: '9–12 years',
  level: 'CEFR A2–B1',
};

/** Appendix C — the topic lock used by every API-channel chat call. */
export const PIP_SYSTEM_PROMPT = `You are "Pip", a friendly English conversation partner for 9–12 year old
students practising spoken English about animals and habitats.
RULES (never break):
- Stay ONLY on the topic of the given animal, its habitat and its adaptations.
- Use simple English (CEFR A2–B1), short sentences, one idea per sentence.
- Ask only WHY / HOW questions that require reasoning, never yes/no questions.
- Never ask for or store the student's name, school, location or any personal data.
- Be encouraging; correct at most ONE error per turn, gently.
- Kid-safe: no scary, violent, or mature content.
- Never output anything except the STRICT JSON object requested in TASK A or TASK B.`;

export const TASK_A_RULES = `TASK A — pronunciation refinement. Input: target sentence, transcript, local
score, keywords. Return STRICT JSON only:
{ "total": 0-100, "accuracy": 0-100, "fluency": 0-100,
  "completeness": 0-100,
  "words": [{ "word": "...", "status": "ok|off|miss|extra" }],
  "advice": "one short, specific sentence" }`;

export const TASK_B_RULES = `TASK B — follow-up. Given the animal, habitat and the student's last answer,
return STRICT JSON only:
{ "reply": "one warm natural sentence", "question": "one WHY/HOW question" }`;

export const OPENERS = [
  "Hi! I can't see your card. Tell me about your animal!",
  "Ooh, a new creature! I'm ready to listen.",
  "Let's talk about your animal together.",
];

export const PRAISE = [
  'Nice describing!', 'That was clear.', 'Good speaking!', 'I like that idea.', 'Well said!',
];

const CAUSAL = ['because', 'so that', 'so ', 'since', 'therefore', "that's why", 'which means', 'as a result', 'to ', 'helps', 'help'];
const FILLERS = ['um', 'uh', 'er', 'erm', 'ah'];

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Open answers are NOT pronunciation-scored. We judge communication instead. */
export function evaluateAnswer(question: string, answer: string, card: CardData): AnswerEval {
  const w = words(answer);
  const usedCausal = CAUSAL.some((c) => answer.toLowerCase().includes(c));
  const topicWords = [
    ...card.keywords.flatMap((k) => words(k)),
    ...words(card.animal), ...words(card.habitatLabel), ...words(card.adaptation),
  ].filter((x) => x.length > 3);
  const qWords = words(question).filter((x) => x.length > 4 && !['why', 'how', 'does', 'your', 'creature', 'when', 'doesn', 'can’t'].includes(x));
  const overlap = topicWords.some((t) => w.includes(t)) || qWords.some((q) => w.includes(q));
  const answered = w.length >= 3 && (overlap || usedCausal);
  const longEnough = w.length >= 5;
  const fillerCount = w.filter((x) => FILLERS.includes(x)).length;
  // summary is kept for compatibility; the UI rebuilds it from the fields
  // above so an already-rendered evaluation follows a language switch.
  const parts: string[] = [
    t(answered ? 'eval.answered' : 'eval.notAnswered'),
    t(usedCausal ? 'eval.causal' : 'eval.tryCausal'),
    t(longEnough ? 'eval.lengthOk' : 'eval.lengthShort', { n: w.length }),
    t(fillerCount === 0 ? 'eval.fluent' : 'eval.fillers', { n: fillerCount }),
  ];
  return {
    answered, usedCausal, longEnough, wordCount: w.length, fillerCount,
    summary: parts.join(' · '),
  };
}

const REPLY_TEMPLATES = [
  (c: CardData) => `Great point! So ${c.adaptation} really helps your ${c.animal.toLowerCase()} in the ${c.habitatLabel.toLowerCase()} — that's an adaptation.`,
  (c: CardData) => `I see! That's why ${c.adaptation} matters so much where it lives.`,
  (c: CardData) => `That makes sense. Your ${c.animal.toLowerCase()} fits its habitat because of ${c.adaptation}.`,
  (c: CardData) => `Good thinking — you connected the animal to its habitat. Scientists call that an adaptation.`,
];

let replyCursor = 0;

/** A warm, natural response — never an error barrage (kid-safe, CLT). */
export function partnerReply(card: CardData, _answer: string, evalResult: AnswerEval): string {
  const opener = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  const body = REPLY_TEMPLATES[replyCursor++ % REPLY_TEMPLATES.length](card);
  const scaffold = evalResult.usedCausal
    ? ''
    : ' Next time, try "It needs ... because ..." to show the reason.';
  return `${opener} ${body}${scaffold}`;
}

export function wrapLine(card: CardData, newWords: string[]): string {
  const list = newWords.length ? newWords.slice(0, 3).join(' / ') : card.keywords.slice(0, 3).join(' / ');
  return t('wrap.newWords', { n: Math.min(3, newWords.length || 3) }) + list;
}

export function encouragement(score: number): string {
  if (score >= 90) return 'Excellent! Your words were very clear.';
  if (score >= 75) return 'Good job! Just a couple of words to polish.';
  if (score >= 60) return 'Keep going! Slow down for the tricky words.';
  return "Let's try again together. Listen first, then speak.";
}
