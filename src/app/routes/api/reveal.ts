import { createFileRoute } from '@tanstack/react-router';
import { revealCard } from '~/lib/game-state';
import { ClientEventSchema } from '~/socket-events';

export const Route = createFileRoute('/api/reveal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { data } = ClientEventSchema.safeParse(await request.json());
        if (data?.type === 'revealCard') {
          revealCard(data.card);
          return new Response(null, { status: 204 });
        }
        return new Response('Invalid event', { status: 400 });
      },
    },
  },
});
