import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/lib/db';
import { buildGameState } from '~/lib/game-state';
import { hasRoomAccess } from '~/lib/room-access';
import { DuetSideSchema } from '~/lib/room-events';
import { type Subscriber, send, sendPing, subscribe, unsubscribe } from '~/lib/room-state';

export const Route = createFileRoute('/api/rooms/$code/events')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const room = await db
          .selectFrom('room')
          .selectAll()
          .where('code', '=', params.code.toLowerCase())
          .executeTakeFirst();
        if (!room) return new Response('Room not found', { status: 404 });
        if (!(await hasRoomAccess(room, request.headers))) {
          return new Response('Forbidden', { status: 403 });
        }
        // The subscriber's declared duet side; personalizes fullState events.
        const side = DuetSideSchema.nullable()
          .catch(null)
          .parse(new URL(request.url).searchParams.get('side'));

        let subscriber: Subscriber;
        let heartbeat: ReturnType<typeof setInterval>;
        const stream = new ReadableStream({
          start(c) {
            subscriber = { controller: c, side };
            subscribe(room.id, subscriber);
            send(c, { type: 'fullState', state: buildGameState(room, side) });
            heartbeat = setInterval(() => {
              try {
                sendPing(c);
              } catch {
                clearInterval(heartbeat);
              }
            }, 30_000);
          },
          cancel() {
            clearInterval(heartbeat);
            unsubscribe(room.id, subscriber);
          },
        });
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      },
    },
  },
});
