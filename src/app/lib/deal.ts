import type { Category, Team } from '~/lib/room-events';
import { shuffleArray } from '~/lib/utils';

export const BOARD_SIZE = 25;

/** Merge bucket word lists, deduplicating case-insensitively (first casing wins). */
export function unionBucketWords(buckets: { words: string[] }[]): string[] {
  const seen = new Set<string>();
  const union: string[] = [];
  for (const bucket of buckets) {
    for (const word of bucket.words) {
      const key = word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        union.push(word);
      }
    }
  }
  return union;
}

/** Deal a fresh board: 1 death, 9 for the starting team, 8 for the other, 7 bystanders. */
export function dealBoard(unionWords: string[], startingTeam: Team) {
  if (unionWords.length < BOARD_SIZE) {
    throw new Error(`Need at least ${BOARD_SIZE} words to deal a board`);
  }
  const words = shuffleArray(unionWords.slice()).slice(0, BOARD_SIZE);
  const otherTeam: Team = startingTeam === 'red' ? 'blue' : 'red';
  const categories: Category[] = shuffleArray([
    'death',
    ...Array<Category>(9).fill(startingTeam),
    ...Array<Category>(8).fill(otherTeam),
    ...Array<Category>(7).fill('bystander'),
  ]);
  return { words, categories };
}
