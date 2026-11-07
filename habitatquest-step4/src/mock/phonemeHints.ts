export interface PhonemeHint {
  ipa: string;
  words: string[];
  /** i18n key (ph.1 … ph.30 / ph.generic), resolved with tr() at render time. */
  tipKey: string;
}

/** 30 common trouble spots for Chinese-speaking young learners.
 *  Tips live in the en/zh dictionaries so the articulation panel follows a
 *  language switch even after the score has already been rendered. */
export const PHONEME_HINTS: PhonemeHint[] = [
  { ipa: '/θ/', words: ['thick', 'three', 'thin', 'think', 'thank', 'thousand', 'through'], tipKey: 'ph.1' },
  { ipa: '/ð/', words: ['this', 'the', 'that', 'these', 'those', 'feathers', 'other', 'weather'], tipKey: 'ph.2' },
  { ipa: '/r/', words: ['warm', 'forest', 'reef', 'red', 'reach', 'grass', 'grow', 'prey', 'dry'], tipKey: 'ph.3' },
  { ipa: '/v/', words: ['live', 'lives', 'have', 'has', 'very', 'vector', 'survive', 'leave', 'leaves'], tipKey: 'ph.4' },
  { ipa: '/æ/', words: ['habitat', 'animal', 'has', 'fat', 'sand', 'grass', 'glide', 'balance', 'camel'], tipKey: 'ph.5' },
  { ipa: '/ʃ/', words: ['shallow', 'sharp', 'shell', 'fish', 'shape', 'she'], tipKey: 'ph.6' },
  { ipa: '/tʃ/', words: ['clownfish', 'catch', 'reach', 'each', 'which', 'chest'], tipKey: 'ph.7' },
  { ipa: '/dʒ/', words: ['giraffe', 'jump', 'gentle', 'large', 'orange'], tipKey: 'ph.8' },
  { ipa: '/ŋ/', words: ['long', 'strong', 'swimming', 'hiding', 'thing', 'wing', 'among'], tipKey: 'ph.9' },
  { ipa: '/l/', words: ['lives', 'long', 'legs', 'leaves', 'glide', 'cold', 'cool', 'small'], tipKey: 'ph.10' },
  { ipa: '/w/', words: ['white', 'warm', 'water', 'wide', 'wet', 'walk', 'wind', 'waterproof'], tipKey: 'ph.11' },
  { ipa: '/j/', words: ['yellow', 'young', 'you', 'useful', 'year'], tipKey: 'ph.12' },
  { ipa: '/z/', words: ['is', 'lives', 'has', 'nose', 'ears', 'trees', 'leaves', 'eyes'], tipKey: 'ph.13' },
  { ipa: '/s/', words: ['snow', 'stay', 'swims', 'so', 'small', 'sting', 'slimy', 'stores'], tipKey: 'ph.14' },
  { ipa: '/ʌ/', words: ['hump', 'hunt', 'sun', 'under', 'colour', 'come', 'does'], tipKey: 'ph.15' },
  { ipa: '/ɑː/', words: ['are', 'large', 'dark', 'grass', 'father', 'calm'], tipKey: 'ph.16' },
  { ipa: '/ɔː/', words: ['warm', 'walk', 'small', 'tall', 'awful', 'floor'], tipKey: 'ph.17' },
  { ipa: '/ɜː/', words: ['fur', 'her', 'bird', 'earn', 'world', 'first'], tipKey: 'ph.18' },
  { ipa: '/iː/', words: ['feet', 'need', 'keep', 'green', 'reef', 'heat', 'each'], tipKey: 'ph.19' },
  { ipa: '/ɪ/', words: ['it', 'is', 'in', 'live', 'big', 'fish', 'thin', 'think'], tipKey: 'ph.20' },
  { ipa: '/uː/', words: ['food', 'cool', 'lose', 'smooth', 'group', 'blue'], tipKey: 'ph.21' },
  { ipa: '/ʊ/', words: ['good', 'look', 'put', 'could', 'wolf'], tipKey: 'ph.22' },
  { ipa: '/e/', words: ['feathers', 'wet', 'desert', 'legs', 'help', 'next', 'when'], tipKey: 'ph.23' },
  { ipa: '/ə/', words: ['a', 'the', 'across', 'about', 'animal', 'balance', 'quiet'], tipKey: 'ph.24' },
  { ipa: '/aɪ/', words: ['white', 'wide', 'glide', 'hide', 'dry', 'ice', 'tiny'], tipKey: 'ph.25' },
  { ipa: '/aʊ/', words: ['owl', 'coat', 'ground', 'found', 'around', 'sound'], tipKey: 'ph.26' },
  { ipa: '/ɔɪ/', words: ['boy', 'noise', 'point', 'join'], tipKey: 'ph.27' },
  { ipa: '/eɪ/', words: ['stay', 'grey', 'shape', 'make', 'they', 'same'], tipKey: 'ph.28' },
  { ipa: '/əʊ/', words: ['cold', 'coat', 'go', 'golden', 'so', 'open', 'ocean'], tipKey: 'ph.29' },
  { ipa: '/C/', words: ['desert', 'forest', 'frost', 'first', 'worst', 'hump', 'warm'], tipKey: 'ph.30' },
];

const INDEX = new Map<string, PhonemeHint>();
for (const hint of PHONEME_HINTS) {
  for (const w of hint.words) {
    const key = w.toLowerCase();
    if (!INDEX.has(key)) INDEX.set(key, hint);
  }
}

export function hintFor(word: string): PhonemeHint | undefined {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, '');
  return INDEX.get(clean);
}

export const GENERIC_HINT: PhonemeHint = {
  ipa: '/·/',
  words: [],
  tipKey: 'ph.generic',
};
