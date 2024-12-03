import { defineConfig } from '@tanstack/start/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    preset: 'node-server',
    experimental: {
      websocket: true,
    },
  },
  vite: {
    plugins: [tsConfigPaths()],
  },
}).addRouter({
  name: 'websocket',
  type: 'http',
  handler: './app/socket-server.ts',
  target: 'server',
  base: '/_ws',
});
