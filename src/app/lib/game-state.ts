import type {
  Category,
  DuetCard,
  DuetPublicState,
  DuetSide,
  DuetStatus,
  GameState,
  Team,
} from '~/lib/room-events';

/** The board columns of a `room` row (structural — satisfied by full row selects). */
export type RoomBoardRow = {
  mode: string;
  deal: number;
  words: string[];
  categories: string[] | null;
  startingTeam: string | null;
  revealed: number[];
  duetKeyA: string[] | null;
  duetKeyB: string[] | null;
  duetAgents: number[];
  duetBystandersA: number[];
  duetBystandersB: number[];
  duetTokens: number;
  duetStatus: string | null;
  duetFatalCard: number | null;
  duetFatalSide: string | null;
};

/** Duet state visible to every player; both keys attached only once the game is over. */
export function buildDuetPublicState(room: RoomBoardRow): DuetPublicState {
  const status = (room.duetStatus ?? 'playing') as DuetStatus;
  const state: DuetPublicState = {
    tokens: room.duetTokens,
    status,
    agents: room.duetAgents,
    bystandersA: room.duetBystandersA,
    bystandersB: room.duetBystandersB,
    fatalCard: room.duetFatalCard,
    fatalSide: room.duetFatalSide as DuetSide | null,
  };
  if (status !== 'playing') {
    state.keyA = room.duetKeyA as DuetCard[];
    state.keyB = room.duetKeyB as DuetCard[];
  }
  return state;
}

/**
 * The single redaction point: everything a client learns about a board comes
 * through here. A live duet key is included only for the viewer's own side.
 */
export function buildGameState(room: RoomBoardRow, side: DuetSide | null): GameState {
  if (room.mode === 'duet') {
    return {
      mode: 'duet',
      deal: room.deal,
      words: room.words,
      duet: buildDuetPublicState(room),
      side,
      key: side === null ? null : ((side === 'a' ? room.duetKeyA : room.duetKeyB) as DuetCard[]),
    };
  }
  return {
    mode: 'classic',
    deal: room.deal,
    startingTeam: room.startingTeam as Team,
    words: room.words,
    categories: room.categories as Category[],
    revealed: room.revealed,
  };
}
