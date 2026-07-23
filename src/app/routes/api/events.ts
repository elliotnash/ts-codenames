import { createFileRoute } from '@tanstack/react-router';
import { subscribe, unsubscribe } from '~/lib/game-state';

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: () => {
        let controller: ReadableStreamDefaultController;
        const stream = new ReadableStream({
          start(c) {
            controller = c;
            subscribe(c);
          },
          cancel() {
            unsubscribe(controller);
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
