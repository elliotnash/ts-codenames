import { z } from 'zod';

export const RevealCardEventSchema = z.object({
  type: z.literal('revealCard'),
  card: z.number().int().min(0).max(24),
});

export const RevealedCardsUpdateEvent = z.object({
  type: z.literal('revealedCardsUpdate'),
  revealedCards: z.array(z.number().int().min(0).max(24)).transform((v) => new Set(v)),
});

export const ClientEventSchema = z.discriminatedUnion('type', [RevealCardEventSchema]);

export const ServerEventSchema = z.discriminatedUnion('type', [RevealedCardsUpdateEvent]);
