import { z } from 'zod';

export const TeamSchema = z.enum(['red', 'blue']);
export type Team = z.infer<typeof TeamSchema>;

export const CategorySchema = z.enum(['red', 'blue', 'bystander', 'death']);
export type Category = z.infer<typeof CategorySchema>;

export const GameModeSchema = z.enum(['classic', 'duet']);
export type GameMode = z.infer<typeof GameModeSchema>;

export const DuetSideSchema = z.enum(['a', 'b']);
export type DuetSide = z.infer<typeof DuetSideSchema>;

export const DuetCardSchema = z.enum(['agent', 'bystander', 'assassin']);
export type DuetCard = z.infer<typeof DuetCardSchema>;

export const DuetStatusSchema = z.enum(['playing', 'won', 'lost']);
export type DuetStatus = z.infer<typeof DuetStatusSchema>;

const CardIndexSchema = z.number().int().min(0).max(24);

// Everything every duet player may see. Keys are per-side secrets while the game
// is running; both appear here only once the game is over (endgame reveal).
export const DuetPublicStateSchema = z.object({
  tokens: z.number().int().min(0).max(9),
  status: DuetStatusSchema,
  agents: z.array(CardIndexSchema),
  bystandersA: z.array(CardIndexSchema),
  bystandersB: z.array(CardIndexSchema),
  fatalCard: CardIndexSchema.nullable(),
  fatalSide: DuetSideSchema.nullable(),
  keyA: z.array(DuetCardSchema).length(25).optional(),
  keyB: z.array(DuetCardSchema).length(25).optional(),
});
export type DuetPublicState = z.infer<typeof DuetPublicStateSchema>;

export const ClassicStateSchema = z.object({
  mode: z.literal('classic'),
  deal: z.number().int().min(1),
  startingTeam: TeamSchema,
  words: z.array(z.string()).length(25),
  categories: z.array(CategorySchema).length(25),
  revealed: z.array(CardIndexSchema),
});
export type ClassicState = z.infer<typeof ClassicStateSchema>;

export const DuetStateSchema = z.object({
  mode: z.literal('duet'),
  deal: z.number().int().min(1),
  words: z.array(z.string()).length(25),
  duet: DuetPublicStateSchema,
  // The viewer's declared side and their own key; null until a side is picked.
  side: DuetSideSchema.nullable(),
  key: z.array(DuetCardSchema).length(25).nullable(),
});
export type DuetState = z.infer<typeof DuetStateSchema>;

export const GameStateSchema = z.discriminatedUnion('mode', [ClassicStateSchema, DuetStateSchema]);
export type GameState = z.infer<typeof GameStateSchema>;

// Server -> client SSE events. Client -> server goes through server functions.
export const FullStateEventSchema = z.object({
  type: z.literal('fullState'),
  state: GameStateSchema,
});

export const RevealedUpdateEventSchema = z.object({
  type: z.literal('revealedUpdate'),
  deal: z.number().int().min(1),
  revealed: z.array(CardIndexSchema),
});

export const DuetUpdateEventSchema = z.object({
  type: z.literal('duetUpdate'),
  deal: z.number().int().min(1),
  duet: DuetPublicStateSchema,
});

export const RoomDeletedEventSchema = z.object({
  type: z.literal('roomDeleted'),
});

export const ServerEventSchema = z.discriminatedUnion('type', [
  FullStateEventSchema,
  RevealedUpdateEventSchema,
  DuetUpdateEventSchema,
  RoomDeletedEventSchema,
]);

export type ServerEvent = z.input<typeof ServerEventSchema>;
