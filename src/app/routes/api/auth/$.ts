import { auth } from '~/lib/auth';
import { createAPIFileRoute } from '@tanstack/start/api';

export const APIRoute = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => {
    console.log('GET', request);
    return auth.handler(request);
  },
  POST: ({ request }) => {
    console.log('POST', request);
    return auth.handler(request);
  },
});
