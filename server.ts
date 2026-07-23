import { join, normalize } from 'node:path';
// @ts-expect-error: untyped build output
import untypedHandler from './dist/server/server';

const handler = untypedHandler as { fetch: (request: Request) => Promise<Response> };

// Production server: serve static client assets, fall back to the SSR handler
// (dist/server/server.js only exports a fetch handler with no static serving).
const clientDir = join(import.meta.dir, 'dist', 'client');

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(request) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      const filePath = normalize(join(clientDir, pathname));
      if (filePath.startsWith(clientDir + '/')) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file, {
            headers: pathname.startsWith('/assets/')
              ? { 'Cache-Control': 'public, max-age=31536000, immutable' }
              : { 'Cache-Control': 'public, max-age=3600' },
          });
        }
      }
    }
    return handler.fetch(request);
  },
});

console.log(`Server running at ${server.url}`);
