import type { DuetSide, ServerEvent } from '~/lib/room-events';

// Per-room SSE stream registries (server-only). The database is the source of
// truth for board state; these streams just push updates to connected clients.
export type Subscriber = {
  controller: ReadableStreamDefaultController;
  // Declared duet side, if any — personalizes fullState events (own key only).
  side: DuetSide | null;
};

const rooms = new Map<string, Set<Subscriber>>();
const encoder = new TextEncoder();

function encode(event: ServerEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function subscribe(roomId: string, subscriber: Subscriber) {
  let subscribers = rooms.get(roomId);
  if (!subscribers) {
    subscribers = new Set();
    rooms.set(roomId, subscribers);
  }
  subscribers.add(subscriber);
}

export function unsubscribe(roomId: string, subscriber: Subscriber) {
  const subscribers = rooms.get(roomId);
  if (!subscribers) return;
  subscribers.delete(subscriber);
  if (subscribers.size === 0) rooms.delete(roomId);
}

/** Send an event to a single stream (e.g. the initial snapshot). */
export function send(controller: ReadableStreamDefaultController, event: ServerEvent) {
  controller.enqueue(encode(event));
}

/** SSE comment frame used as a keep-alive heartbeat. */
export function sendPing(controller: ReadableStreamDefaultController) {
  controller.enqueue(encoder.encode(': ping\n\n'));
}

/** Broadcast an event; pass a builder to personalize it per subscriber (duet keys). */
export function broadcast(
  roomId: string,
  event: ServerEvent | ((subscriber: Subscriber) => ServerEvent),
) {
  const subscribers = rooms.get(roomId);
  if (!subscribers) return;

  if (typeof event !== 'function') {
    const chunk = encode(event);
    for (const subscriber of subscribers) {
      try {
        subscriber.controller.enqueue(chunk);
      } catch {
        subscribers.delete(subscriber);
      }
    }
    return;
  }

  // Personalized events differ only by side, so at most three encodings.
  const sideChunks = new Map<DuetSide | null, Uint8Array>();
  for (const subscriber of subscribers) {
    let chunk = sideChunks.get(subscriber.side);
    if (!chunk) {
      chunk = encode(event(subscriber));
      sideChunks.set(subscriber.side, chunk);
    }
    try {
      subscriber.controller.enqueue(chunk);
    } catch {
      subscribers.delete(subscriber);
    }
  }
}

/** Notify all of a deleted room's clients and close their streams. */
export function closeRoom(roomId: string) {
  const subscribers = rooms.get(roomId);
  if (!subscribers) return;
  const chunk = encode({ type: 'roomDeleted' });
  for (const subscriber of subscribers) {
    try {
      subscriber.controller.enqueue(chunk);
      subscriber.controller.close();
    } catch {
      // stream already dead
    }
  }
  rooms.delete(roomId);
}
