import type { ServerEvent } from '~/lib/room-events';

// Per-room SSE stream registries (server-only). The database is the source of
// truth for board state; these streams just push updates to connected clients.
const rooms = new Map<string, Set<ReadableStreamDefaultController>>();
const encoder = new TextEncoder();

function encode(event: ServerEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function subscribe(roomId: string, controller: ReadableStreamDefaultController) {
  let controllers = rooms.get(roomId);
  if (!controllers) {
    controllers = new Set();
    rooms.set(roomId, controllers);
  }
  controllers.add(controller);
}

export function unsubscribe(roomId: string, controller: ReadableStreamDefaultController) {
  const controllers = rooms.get(roomId);
  if (!controllers) return;
  controllers.delete(controller);
  if (controllers.size === 0) rooms.delete(roomId);
}

/** Send an event to a single stream (e.g. the initial snapshot). */
export function send(controller: ReadableStreamDefaultController, event: ServerEvent) {
  controller.enqueue(encode(event));
}

/** SSE comment frame used as a keep-alive heartbeat. */
export function sendPing(controller: ReadableStreamDefaultController) {
  controller.enqueue(encoder.encode(': ping\n\n'));
}

export function broadcast(roomId: string, event: ServerEvent) {
  const controllers = rooms.get(roomId);
  if (!controllers) return;
  const chunk = encode(event);
  for (const controller of controllers) {
    try {
      controller.enqueue(chunk);
    } catch {
      controllers.delete(controller);
    }
  }
}

/** Notify all of a deleted room's clients and close their streams. */
export function closeRoom(roomId: string) {
  const controllers = rooms.get(roomId);
  if (!controllers) return;
  const chunk = encode({ type: 'roomDeleted' });
  for (const controller of controllers) {
    try {
      controller.enqueue(chunk);
      controller.close();
    } catch {
      // stream already dead
    }
  }
  rooms.delete(roomId);
}
