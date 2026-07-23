import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/lib/db';
import { hasRoomAccess } from '~/lib/room-access';
import type { Category, Team } from '~/lib/room-events';
import { send, sendPing, subscribe, unsubscribe } from '~/lib/room-state';

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

        let controller: ReadableStreamDefaultController;
        let heartbeat: ReturnType<typeof setInterval>;
        const stream = new ReadableStream({
          start(c) {
            controller = c;
            subscribe(room.id, c);
            send(c, {
              type: 'fullState',
              deal: room.deal,
              startingTeam: room.startingTeam as Team,
              words: room.words,
              categories: room.categories as Category[],
              revealed: room.revealed,
            });
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
            unsubscribe(room.id, controller);
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
