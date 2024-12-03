import { match } from 'ts-pattern';
import { defineEventHandler, defineWebSocket } from 'vinxi/http';
import { ClientEventSchema, type RevealedCardsUpdateEvent } from './socket-events';
import type { z } from 'zod';

const revealedCards = new Set<number>();

export default defineEventHandler({
  handler() {},
  websocket: defineWebSocket({
    async open(peer) {
      // Send the new client the currently revealed cards.
      peer.send({
        type: 'revealedCardsUpdate',
        revealedCards: [...revealedCards],
      } satisfies z.input<typeof RevealedCardsUpdateEvent>);
      // Subscribe to future card reveal updates.
      peer.subscribe('revealedCardsUpdate');
    },
    async message(peer, message) {
      try {
        const jsonMessage = JSON.parse(message.text());
        const { data } = ClientEventSchema.safeParse(jsonMessage);
        if (data) {
          match(data).with({ type: 'revealCard' }, (update) => {
            // Add revealed card to the set of revealed cards.
            revealedCards.add(update.card);
            // Send all other clients the new revealed cards.
            peer.publish('revealedCardsUpdate', {
              type: 'revealedCardsUpdate',
              revealedCards: [...revealedCards],
            } satisfies z.input<typeof RevealedCardsUpdateEvent>);
          });
        } else {
          peer.send('Unknown event');
        }
      } catch (e) {
        if (message.text() === 'ping') {
          peer.send('pong');
        } else {
          peer.send('Invalid message format');
        }
      }
    },
    close(peer) {
      peer.unsubscribe('revealedCardsUpdate');
    },
  }),
});
