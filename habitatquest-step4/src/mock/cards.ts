import type { CardData, HabitatId } from '../types';

/* All 12 illustrations are bundled locally. No network, no API key. */
const svgModules = import.meta.glob('../assets/cards/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function illustrationFor(file: string): string {
  const key = Object.keys(svgModules).find((k) => k.endsWith('/' + file));
  return key ? svgModules[key] : '';
}

export const HABITAT_META: Record<HabitatId, { label: string; zh: string; color: string }> = {
  polar:   { label: 'Polar Tundra',       zh: '极地苔原', color: '#8E9BB8' },
  ocean:   { label: 'Coral Reef & Ocean', zh: '珊瑚礁与海洋', color: '#2F8FA8' },
  desert:  { label: 'Hot Desert',         zh: '炎热沙漠', color: '#D9A05B' },
  savanna: { label: 'African Savanna',    zh: '非洲草原', color: '#C9A961' },
  forest:  { label: 'Temperate Forest',   zh: '温带森林', color: '#4F7A57' },
  wetland: { label: 'Freshwater Wetland', zh: '淡水湿地', color: '#6D9B84' },
};

export const CARDS: CardData[] = [
  {
    id: 'polar-owl', animal: 'Snowy Owl', chineseName: '雪鸮',
    habitat: 'polar', habitatLabel: 'Polar Tundra', color: '#8E9BB8',
    illustration: 'polar-owl.svg', difficulty: 2,
    target: 'This is a snowy owl. It lives in the polar tundra. It has thick white feathers to stay warm in the cold.',
    keywords: ['thick white feathers', 'polar tundra', 'stay warm'],
    adaptation: 'thick white feathers',
    imagePrompt: 'A snowy owl with thick white feathers standing on polar tundra snow, flat vector illustration for children',
  },
  {
    id: 'polar-fox', animal: 'Arctic Fox', chineseName: '北极狐',
    habitat: 'polar', habitatLabel: 'Polar Tundra', color: '#8E9BB8',
    illustration: 'polar-fox.svg', difficulty: 1,
    target: 'This is an arctic fox. It lives on the cold tundra. It has thick fur and a white coat to hide in the snow.',
    keywords: ['thick fur', 'white coat', 'cold tundra'],
    adaptation: 'thick fur',
    imagePrompt: 'An arctic fox with thick white fur sitting on snowy tundra, flat vector illustration for children',
  },
  {
    id: 'ocean-clownfish', animal: 'Clownfish', chineseName: '小丑鱼',
    habitat: 'ocean', habitatLabel: 'Coral Reef', color: '#2F8FA8',
    illustration: 'ocean-clownfish.svg', difficulty: 1,
    target: 'This is a clownfish. It lives in a warm coral reef. It has a slimy coat so the anemone does not sting it.',
    keywords: ['coral reef', 'slimy coat', 'anemone'],
    adaptation: 'slimy coat',
    imagePrompt: 'An orange clownfish swimming near a sea anemone in a coral reef, flat vector illustration for children',
  },
  {
    id: 'ocean-turtle', animal: 'Green Sea Turtle', chineseName: '绿海龟',
    habitat: 'ocean', habitatLabel: 'Open Ocean', color: '#2F8FA8',
    illustration: 'ocean-turtle.svg', difficulty: 3,
    target: 'This is a green sea turtle. It swims across the open ocean. It has wide flippers so it can glide for miles.',
    keywords: ['open ocean', 'wide flippers', 'glide'],
    adaptation: 'wide flippers',
    imagePrompt: 'A green sea turtle with wide flippers gliding through the open ocean, flat vector illustration for children',
  },
  {
    id: 'desert-fennec', animal: 'Fennec Fox', chineseName: '耳廓狐',
    habitat: 'desert', habitatLabel: 'Hot Desert', color: '#D9A05B',
    illustration: 'desert-fennec.svg', difficulty: 2,
    target: 'This is a fennec fox. It lives in the hot desert. It has huge ears so it can lose heat and hear tiny prey.',
    keywords: ['huge ears', 'hot desert', 'lose heat'],
    adaptation: 'huge ears',
    imagePrompt: 'A fennec fox with huge ears sitting on hot desert sand dunes, flat vector illustration for children',
  },
  {
    id: 'desert-camel', animal: 'Camel', chineseName: '骆驼',
    habitat: 'desert', habitatLabel: 'Hot Desert', color: '#D9A05B',
    illustration: 'desert-camel.svg', difficulty: 3,
    target: 'This is a camel. It walks across the dry desert. It stores fat in its hump so it can go without food.',
    keywords: ['stores fat', 'dry desert', 'hump'],
    adaptation: 'fat-storing hump',
    imagePrompt: 'A camel with a fat-storing hump crossing dry desert dunes, flat vector illustration for children',
  },
  {
    id: 'savanna-lion', animal: 'Lion', chineseName: '狮子',
    habitat: 'savanna', habitatLabel: 'African Savanna', color: '#C9A961',
    illustration: 'savanna-lion.svg', difficulty: 1,
    target: 'This is a lion. It lives on the grassy savanna. It has golden fur so it can hide in the tall dry grass.',
    keywords: ['golden fur', 'grassy savanna', 'hide'],
    adaptation: 'camouflage fur',
    imagePrompt: 'A lion with golden fur hiding in tall dry savanna grass, flat vector illustration for children',
  },
  {
    id: 'savanna-giraffe', animal: 'Giraffe', chineseName: '长颈鹿',
    habitat: 'savanna', habitatLabel: 'African Savanna', color: '#C9A961',
    illustration: 'savanna-giraffe.svg', difficulty: 2,
    target: 'This is a giraffe. It lives on the open savanna. It has a long neck so it can reach leaves high in the trees.',
    keywords: ['long neck', 'open savanna', 'reach leaves'],
    adaptation: 'long neck',
    imagePrompt: 'A giraffe with a long neck reaching leaves in a tall acacia tree on the savanna, flat vector illustration',
  },
  {
    id: 'forest-frog', animal: 'Tree Frog', chineseName: '树蛙',
    habitat: 'forest', habitatLabel: 'Rainforest', color: '#4F7A57',
    illustration: 'forest-frog.svg', difficulty: 2,
    target: 'This is a tree frog. It lives in the wet rainforest. It has sticky toes so it can climb on smooth wet leaves.',
    keywords: ['sticky toes', 'wet rainforest', 'climb'],
    adaptation: 'sticky toe pads',
    imagePrompt: 'A green tree frog with sticky toes on a wet leaf in the rainforest, flat vector illustration for children',
  },
  {
    id: 'forest-fox', animal: 'Red Fox', chineseName: '赤狐',
    habitat: 'forest', habitatLabel: 'Temperate Forest', color: '#4F7A57',
    illustration: 'forest-fox.svg', difficulty: 3,
    target: 'This is a red fox. It lives in the quiet forest. It has a bushy tail so it can balance and keep warm at night.',
    keywords: ['bushy tail', 'quiet forest', 'balance'],
    adaptation: 'bushy tail',
    imagePrompt: 'A red fox with a bushy tail standing among ferns in a temperate forest, flat vector illustration',
  },
  {
    id: 'wetland-heron', animal: 'Grey Heron', chineseName: '苍鹭',
    habitat: 'wetland', habitatLabel: 'Freshwater Wetland', color: '#6D9B84',
    illustration: 'wetland-heron.svg', difficulty: 2,
    target: 'This is a grey heron. It lives in a shallow wetland. It has long legs so it can wade and hunt for fish.',
    keywords: ['long legs', 'shallow wetland', 'wade'],
    adaptation: 'long legs',
    imagePrompt: 'A grey heron with long legs wading among reeds in a shallow wetland, flat vector illustration',
  },
  {
    id: 'wetland-duck', animal: 'Mallard Duck', chineseName: '绿头鸭',
    habitat: 'wetland', habitatLabel: 'Freshwater Wetland', color: '#6D9B84',
    illustration: 'wetland-duck.svg', difficulty: 1,
    target: 'This is a mallard duck. It lives on a quiet wetland. It has waterproof feathers so it stays dry while it swims.',
    keywords: ['waterproof feathers', 'quiet wetland', 'stays dry'],
    adaptation: 'waterproof feathers',
    imagePrompt: 'A mallard duck with waterproof feathers swimming on a quiet wetland, flat vector illustration',
  },
];

/** Deterministic per-day shuffle so a demo always feels fresh but is reproducible. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick 8 cards, ordered easy -> harder, one from each habitat where possible. */
export function pickSessionCards(count = 8, seed = new Date().getDate()): CardData[] {
  const byHabitat = (Object.keys(HABITAT_META) as HabitatId[])
    .map((h) => seededShuffle(CARDS.filter((c) => c.habitat === h), seed + h.length)[0]);
  const rest = seededShuffle(CARDS.filter((c) => !byHabitat.includes(c)), seed * 7 + 3);
  return [...byHabitat, ...rest].slice(0, count).sort((a, b) => a.difficulty - b.difficulty);
}

export function wordList(sentence: string): string[] {
  return sentence.trim().split(/\s+/);
}
