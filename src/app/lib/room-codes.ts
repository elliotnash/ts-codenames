// Room codes: lowercase letters, digits, and inner hyphens; 3-24 chars.
export const ROOM_CODE_REGEX = /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/;

const ADJECTIVES = [
  'able', 'amber', 'ancient', 'bold', 'brave', 'bright', 'brisk', 'calm', 'clever', 'cosmic',
  'crimson', 'daring', 'deft', 'dusty', 'eager', 'early', 'fabled', 'fancy', 'fierce', 'fleet',
  'gentle', 'gilded', 'glad', 'golden', 'grand', 'happy', 'hardy', 'hidden', 'humble', 'jolly',
  'keen', 'kind', 'lively', 'loyal', 'lucky', 'lunar', 'merry', 'mighty', 'misty', 'noble',
  'polar', 'proud', 'quick', 'quiet', 'rapid', 'royal', 'rustic', 'silent', 'silver', 'sly',
  'snowy', 'solar', 'stout', 'sunny', 'swift', 'tidy', 'vivid', 'wild', 'wise', 'witty',
];

const NOUNS = [
  'badger', 'bear', 'beetle', 'bison', 'crane', 'crow', 'deer', 'dolphin', 'eagle', 'falcon',
  'ferret', 'finch', 'fox', 'gecko', 'hare', 'hawk', 'heron', 'horse', 'hound', 'ibis',
  'jaguar', 'koala', 'lemur', 'lion', 'llama', 'lynx', 'marten', 'mole', 'moose', 'moth',
  'newt', 'orca', 'osprey', 'otter', 'owl', 'panda', 'panther', 'pigeon', 'puffin', 'rabbit',
  'raven', 'robin', 'salmon', 'seal', 'shark', 'sparrow', 'stork', 'swan', 'tiger', 'toad',
  'trout', 'turtle', 'viper', 'walrus', 'weasel', 'whale', 'wolf', 'wombat', 'wren', 'yak',
];

function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

export function generateRoomCode(withSuffix = false): string {
  const code = `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
  return withSuffix ? `${code}-${Math.floor(Math.random() * 90) + 10}` : code;
}
