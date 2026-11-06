import type { HabitatId } from '../types';

/**
 * All follow-ups are WHY / HOW causal questions. No yes/no, no grammar quizzes.
 * This is what keeps the task at "Analyzing & Communicating" (Upper Bloom's).
 */
export const QUESTION_BANK: Record<HabitatId, string[]> = {
  polar: [
    'Why does your creature need thick fur to survive here?',
    'How does it keep warm when the wind is freezing?',
    'Why is white a useful colour for this animal?',
    'How does it find food when the ground is covered in snow?',
    "Why can't it live in a warm forest?",
    'How do its feet help it walk on ice?',
  ],
  ocean: [
    'Why does your creature need wide flippers in the open ocean?',
    'How does it move through water without getting tired?',
    'Why is a slimy coat useful near the anemone?',
    'How does it hide from bigger fish in the reef?',
    "Why can't it live in a dry desert?",
    'How does its body shape help it swim so fast?',
  ],
  desert: [
    'Why does your creature need huge ears in the hot desert?',
    'How does it stay cool when the sand is burning?',
    'Why can it go for many days without water?',
    'How does it find food when the desert is so empty?',
    "Why can't it live in a cold wetland?",
    'How does its colour help it hide from other animals?',
  ],
  savanna: [
    'Why does your creature need a long neck on the savanna?',
    'How does golden fur help it hunt in tall grass?',
    'Why does it live in a group instead of alone?',
    'How does it find water in the dry season?',
    "Why can't it live in a thick dark forest?",
    'How do its legs help it run away from danger?',
  ],
  forest: [
    'Why does your creature need sticky toes in the rainforest?',
    'How does it stay safe high up in the trees?',
    'Why is it hard to see this animal among the leaves?',
    'How does it find food when the forest is dark?',
    "Why can't it live on an open icy plain?",
    'How does its tail help it move through the branches?',
  ],
  wetland: [
    'Why does your creature need long legs in the wetland?',
    'How do waterproof feathers keep it warm and dry?',
    'Why is shallow water a good place to find food?',
    'How does it stand still for so long while it hunts?',
    "Why can't it live in a hot dry desert?",
    'How does its beak help it catch slippery fish?',
  ],
};

/** Scaffolding frames — Communicative Language Teaching support, not answers. */
export const SENTENCE_FRAMES = [
  'It needs ... because ...',
  'It can ... so that ...',
  'If the habitat were ..., it would ...',
  'This helps it to ... when ...',
];

const used = new Set<string>();

/** Draw a non-repeating question for a habitat; resets when the bank is exhausted. */
export function nextQuestion(habitat: HabitatId, cardId: string): string {
  const bank = QUESTION_BANK[habitat];
  const fresh = bank.filter((q) => !used.has(cardId + '|' + q));
  if (!fresh.length) {
    bank.forEach((q) => used.delete(cardId + '|' + q));
    return bank[0];
  }
  const q = fresh[Math.floor(Math.random() * fresh.length)];
  used.add(cardId + '|' + q);
  return q;
}

export function resetQuestionBank(): void { used.clear(); }

/** Guard used by both channels: any generated question must be a Why/How one. */
export function isCausalQuestion(q: string): boolean {
  return /^\s*(why|how)\b/i.test(q) && q.trim().endsWith('?');
}
