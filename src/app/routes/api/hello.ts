import { privateEnv, publicEnv } from '@/env';
import { createAPIFileRoute } from '@tanstack/start/api';

export const APIRoute = createAPIFileRoute('/api/hello')({
  GET: async ({ request }) => {
    return new Response(`Hello, World! from ${request.url}`);
  },
});
