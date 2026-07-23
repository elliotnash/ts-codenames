import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { envOnlyMacros } from 'vite-env-only';
import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3000, host: true },
  // Resolve tsconfig `paths` aliases (~/*, @/*) natively (Vite >= 8).
  resolve: { tsconfigPaths: true },
  plugins: [
    envOnlyMacros(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src/app',
      router: {
        generatedRouteTree: 'route-tree.gen.ts',
        quoteStyle: 'single',
      },
    }),
    // Must come after tanstackStart().
    viteReact(),
  ],
});
