export interface PhonemeHint {
  ipa: string;
  words: string[];
  tip: string;
}

/** 30 common trouble spots for Chinese-speaking young learners. */
export const PHONEME_HINTS: PhonemeHint[] = [
  { ipa: '/θ/', words: ['thick', 'three', 'thin', 'think', 'thank', 'thousand', 'through'], tip: '舌尖轻放在上下齿之间，送气，不要读成 /s/。' },
  { ipa: '/ð/', words: ['this', 'the', 'that', 'these', 'those', 'feathers', 'other', 'weather'], tip: '舌尖位置同 /θ/，但声带要振动，别读成 /z/。' },
  { ipa: '/r/', words: ['warm', 'forest', 'reef', 'red', 'reach', 'grass', 'grow', 'prey', 'dry'], tip: '舌尖卷起但不碰上颚，嘴唇略圆，别读成 /l/。' },
  { ipa: '/v/', words: ['live', 'lives', 'have', 'has', 'very', 'vector', 'survive', 'leave', 'leaves'], tip: '上齿轻咬下唇，声带振动，别读成 /w/。' },
  { ipa: '/æ/', words: ['habitat', 'animal', 'has', 'fat', 'sand', 'grass', 'glide', 'balance', 'camel'], tip: '嘴张大、舌位低平，介于「啊」和「哎」之间。' },
  { ipa: '/ʃ/', words: ['shallow', 'sharp', 'shell', 'fish', 'shape', 'she'], tip: '双唇略前突，舌面靠近硬腭，别读成 /s/。' },
  { ipa: '/tʃ/', words: ['clownfish', 'catch', 'reach', 'each', 'which', 'chest'], tip: '先堵住气流再摩擦放出，像「ch」但更短。' },
  { ipa: '/dʒ/', words: ['giraffe', 'jump', 'gentle', 'large', 'orange'], tip: '舌位同 /tʃ/，声带要振动。' },
  { ipa: '/ŋ/', words: ['long', 'strong', 'swimming', 'hiding', 'thing', 'wing', 'among'], tip: '舌后抵住软腭，气流从鼻腔出，别补一个 /g/。' },
  { ipa: '/l/', words: ['lives', 'long', 'legs', 'leaves', 'glide', 'cold', 'cool', 'small'], tip: '舌尖抵上齿龈，词尾的暗 l 舌后要略抬。' },
  { ipa: '/w/', words: ['white', 'warm', 'water', 'wide', 'wet', 'walk', 'wind', 'waterproof'], tip: '双唇收圆再快速滑开，别读成 /v/。' },
  { ipa: '/j/', words: ['yellow', 'young', 'you', 'useful', 'year'], tip: '舌面抬向硬腭，很快滑到后面的元音。' },
  { ipa: '/z/', words: ['is', 'lives', 'has', 'nose', 'ears', 'trees', 'leaves', 'eyes'], tip: '声带振动的 /s/，词尾不要吞掉。' },
  { ipa: '/s/', words: ['snow', 'stay', 'swims', 'so', 'small', 'sting', 'slimy', 'stores'], tip: '舌尖靠近上齿龈留窄缝，不要加元音「斯」。' },
  { ipa: '/ʌ/', words: ['hump', 'hunt', 'sun', 'under', 'colour', 'come', 'does'], tip: '嘴自然张开、舌位居中偏后，短促有力。' },
  { ipa: '/ɑː/', words: ['are', 'large', 'dark', 'grass', 'father', 'calm'], tip: '嘴张大，舌身压低后缩，音要拉长。' },
  { ipa: '/ɔː/', words: ['warm', 'walk', 'small', 'tall', 'awful', 'floor'], tip: '双唇收圆略前突，音长，别读成 /o/。' },
  { ipa: '/ɜː/', words: ['fur', 'her', 'bird', 'earn', 'world', 'first'], tip: '舌位居中，双唇放松，美式需卷舌。' },
  { ipa: '/iː/', words: ['feet', 'need', 'keep', 'green', 'reef', 'heat', 'each'], tip: '嘴角向两边展开，音要够长。' },
  { ipa: '/ɪ/', words: ['it', 'is', 'in', 'live', 'big', 'fish', 'thin', 'think'], tip: '比 /iː/ 短而松，嘴别咧太大。' },
  { ipa: '/uː/', words: ['food', 'cool', 'lose', 'smooth', 'group', 'blue'], tip: '双唇收得很圆很小，音长。' },
  { ipa: '/ʊ/', words: ['good', 'look', 'put', 'could', 'wolf'], tip: '短而松，双唇略圆即可。' },
  { ipa: '/e/', words: ['feathers', 'wet', 'desert', 'legs', 'help', 'next', 'when'], tip: '嘴半开，舌位前中，别读成 /æ/。' },
  { ipa: '/ə/', words: ['a', 'the', 'across', 'about', 'animal', 'balance', 'quiet'], tip: '最轻最短的中央元音，别把每个音节都读重。' },
  { ipa: '/aɪ/', words: ['white', 'wide', 'glide', 'hide', 'dry', 'ice', 'tiny'], tip: '从 /a/ 滑向 /ɪ/，前重后轻。' },
  { ipa: '/aʊ/', words: ['owl', 'coat', 'ground', 'found', 'around', 'sound'], tip: '从 /a/ 滑向 /ʊ/，双唇最后由大变小。' },
  { ipa: '/ɔɪ/', words: ['boy', 'noise', 'point', 'join'], tip: '从 /ɔː/ 滑向 /ɪ/，唇形由圆变扁。' },
  { ipa: '/eɪ/', words: ['stay', 'grey', 'shape', 'make', 'they', 'same'], tip: '从 /e/ 滑向 /ɪ/，不要读成单个「诶」。' },
  { ipa: '/əʊ/', words: ['cold', 'coat', 'go', 'golden', 'so', 'open', 'ocean'], tip: '从 /ə/ 滑向 /ʊ/，双唇逐渐收圆。' },
  { ipa: '/C/', words: ['desert', 'forest', 'frost', 'first', 'worst', 'hump', 'warm'], tip: '辅音连缀要连着读，中间别加元音，词尾辅音别吞掉。' },
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
  tip: '放慢一点，把每个音节读清楚，注意词尾的辅音不要吞掉。',
};
