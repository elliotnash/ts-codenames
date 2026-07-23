import type { z } from 'zod';
import type { RevealedCardsUpdateEvent } from '~/socket-events';

// Global in-memory game state shared across all clients (server-only).
// Replaces the old vinxi WebSocket `revealedCards` set; reveals are now
// broadcast to connected clients over Server-Sent Events.
const revealedCards = new Set<number>();
const clients = new Set<ReadableStreamDefaultController>();
const encoder = new TextEncoder();

function encodeUpdate() {
  const event = {
    type: 'revealedCardsUpdate',
    revealedCards: [...revealedCards],
  } satisfies z.input<typeof RevealedCardsUpdateEvent>;
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** Register an SSE stream and immediately send it the current revealed cards. */
export function subscribe(controller: ReadableStreamDefaultController) {
  clients.add(controller);
  controller.enqueue(encodeUpdate());
}

export function unsubscribe(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

/** Reveal a card and broadcast the updated set to every connected client. */
export function revealCard(card: number) {
  revealedCards.add(card);
  const chunk = encodeUpdate();
  for (const controller of clients) {
    try {
      controller.enqueue(chunk);
    } catch {
      clients.delete(controller);
    }
  }
}
