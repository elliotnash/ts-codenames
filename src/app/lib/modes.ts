import { match } from 'ts-pattern';
import { dealBoard, drawBoardWords } from '~/lib/deal';
import type { Category, DuetCard, GameMode, Team } from '~/lib/room-events';
import { shuffleArray } from '~/lib/utils';

export const MODE_INFO: Record<GameMode, { label: string; description: string }> = {
  classic: { label: 'Classic', description: 'Two teams race to contact their agents first.' },
  duet: { label: 'Duet', description: 'Work together to find all 15 agents before time runs out.' },
};

export const DUET_TOKENS = 9;
export const DUET_TOTAL_AGENTS = 15;

// Fixed (side A, side B) key-card distribution from the Duet rulebook. Each side
// sees 9 agents, 3 assassins, and 13 bystanders; 3 agents and 1 assassin are
// shared, for 15 unique agents total.
const DUET_PAIRS: readonly (readonly [DuetCard, DuetCard])[] = [
  ...Array<readonly [DuetCard, DuetCard]>(3).fill(['agent', 'agent']),
  ...Array<readonly [DuetCard, DuetCard]>(1).fill(['agent', 'assassin']),
  ...Array<readonly [DuetCard, DuetCard]>(5).fill(['agent', 'bystander']),
  ...Array<readonly [DuetCard, DuetCard]>(1).fill(['assassin', 'agent']),
  ...Array<readonly [DuetCard, DuetCard]>(1).fill(['assassin', 'assassin']),
  ...Array<readonly [DuetCard, DuetCard]>(1).fill(['assassin', 'bystander']),
  ...Array<readonly [DuetCard, DuetCard]>(5).fill(['bystander', 'agent']),
  ...Array<readonly [DuetCard, DuetCard]>(1).fill(['bystander', 'assassin']),
  ...Array<readonly [DuetCard, DuetCard]>(7).fill(['bystander', 'bystander']),
];

/** Every board column — each deal fully overwrites the previous mode's state. */
export type BoardReset = {
  words: string[];
  categories: Category[] | null;
  startingTeam: Team | null;
  revealed: number[];
  duetKeyA: DuetCard[] | null;
  duetKeyB: DuetCard[] | null;
  duetAgents: number[];
  duetBystandersA: number[];
  duetBystandersB: number[];
  duetTokens: number;
  duetStatus: 'playing' | null;
  duetFatalCard: null;
  duetFatalSide: null;
};

export function dealGame(
  mode: GameMode,
  unionWords: string[],
  prev?: { startingTeam: string | null },
): BoardReset {
  const cleared: Pick<
    BoardReset,
    | 'revealed'
    | 'duetAgents'
    | 'duetBystandersA'
    | 'duetBystandersB'
    | 'duetTokens'
    | 'duetFatalCard'
    | 'duetFatalSide'
  > = {
    revealed: [],
    duetAgents: [],
    duetBystandersA: [],
    duetBystandersB: [],
    duetTokens: DUET_TOKENS,
    duetFatalCard: null,
    duetFatalSide: null,
  };

  return match(mode)
    .with('classic', (): BoardReset => {
      // Alternate the starting team; random on creation or when switching modes.
      const startingTeam: Team =
        prev?.startingTeam === 'red'
          ? 'blue'
          : prev?.startingTeam === 'blue'
            ? 'red'
            : Math.random() < 0.5
              ? 'red'
              : 'blue';
      const board = dealBoard(unionWords, startingTeam);
      return {
        ...cleared,
        words: board.words,
        categories: board.categories,
        startingTeam,
        duetKeyA: null,
        duetKeyB: null,
        duetStatus: null,
      };
    })
    .with('duet', (): BoardReset => {
      const pairs = shuffleArray([...DUET_PAIRS]);
      return {
        ...cleared,
        words: drawBoardWords(unionWords),
        categories: null,
        startingTeam: null,
        duetKeyA: pairs.map((pair) => pair[0]),
        duetKeyB: pairs.map((pair) => pair[1]),
        duetStatus: 'playing',
      };
    })
    .exhaustive();
}
