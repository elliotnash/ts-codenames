import { defineConfig } from '@tanstack/start/config';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import tsConfigPaths from 'vite-tsconfig-paths';

const config = {
  appDirectory: 'src/app',
  autoOpenBrowser: false,
};

const app = defineConfig({
  server: {
    preset: 'node-server',
    experimental: {
      websocket: true,
    },
  },
  routers: {
    api: {
      entry: join(config.appDirectory, 'api-entry.ts'),
    },
    ssr: {
      entry: join(config.appDirectory, 'ssr-entry.tsx'),
    },
    client: {
      entry: join(config.appDirectory, 'client-entry.tsx'),
    },
  },
  tsr: {
    appDirectory: config.appDirectory,
    generatedRouteTree: join(config.appDirectory, 'route-tree.gen.ts'),
    quoteStyle: 'single',
    semicolons: true,
    customScaffolding: {
      routeTemplate: [
        '%%tsrImports%%\n\n',
        '%%tsrExportStart%%{\n component: RouteComponent\n }%%tsrExportEnd%%\n\n',
        'function RouteComponent() { return "Hello %%tsrPath%%!" }\n',
      ].join(''),
      apiTemplate: [
        'import { json } from "@tanstack/start";\n',
        '%%tsrImports%%\n\n',
        '%%tsrExportStart%%{ GET: ({ request, params }) => { return json({ message:\'Hello "%%tsrPath%%"!\' }) }}%%tsrExportEnd%%\n',
      ].join(''),
    },
  },
  vite: {
    plugins: [tsConfigPaths()],
  },
}).addRouter({
  name: 'websocket',
  type: 'http',
  handler: './src/app/socket-server.ts',
  target: 'server',
  base: '/_ws',
});

app.hooks.hook('app:dev:server:listener:created', ({ listener }) => {
  if (!config.autoOpenBrowser) return;
  exec(`open ${listener.url}`);
});

export default app;
