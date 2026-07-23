import { z } from 'zod';

export const TeamSchema = z.enum(['red', 'blue']);
export type Team = z.infer<typeof TeamSchema>;

export const CategorySchema = z.enum(['red', 'blue', 'bystander', 'death']);
export type Category = z.infer<typeof CategorySchema>;

// Server -> client SSE events. Client -> server goes through server functions.
export const FullStateEventSchema = z.object({
  type: z.literal('fullState'),
  deal: z.number().int().min(1),
  startingTeam: TeamSchema,
  words: z.array(z.string()).length(25),
  categories: z.array(CategorySchema).length(25),
  revealed: z.array(z.number().int().min(0).max(24)),
});

export const RevealedUpdateEventSchema = z.object({
  type: z.literal('revealedUpdate'),
  deal: z.number().int().min(1),
  revealed: z.array(z.number().int().min(0).max(24)),
});

export const RoomDeletedEventSchema = z.object({
  type: z.literal('roomDeleted'),
});

export const ServerEventSchema = z.discriminatedUnion('type', [
  FullStateEventSchema,
  RevealedUpdateEventSchema,
  RoomDeletedEventSchema,
]);

export type ServerEvent = z.input<typeof ServerEventSchema>;
