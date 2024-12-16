import { ThemeProvider } from '~/components/theme';
import styles from '~/globals.css?url';
import { createRootRouteWithContext } from '@tanstack/react-router';
import { Outlet, ScrollRestoration } from '@tanstack/react-router';
import { Meta, Scripts } from '@tanstack/start';
import * as React from 'react';
import { Toaster } from '~/components/ui/toaster';
import type { RouterContext } from '~/router';
import { publicEnv } from '@/env';
import { useAuthOptions } from '~/hooks/use-auth';

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.prefetchQuery(useAuthOptions());
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Codenames' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: React.PropsWithChildren) {
  const RouterDevtools =
    publicEnv().mode === 'production'
      ? () => null
      : React.lazy(() =>
          import('@tanstack/router-devtools').then((mod) => ({
            default: mod.TanStackRouterDevtools,
          })),
        );

  const QueryDevtools =
    publicEnv().mode === 'production'
      ? () => null
      : React.lazy(() =>
          import('@tanstack/react-query-devtools').then((mod) => ({
            default: mod.ReactQueryDevtools,
          })),
        );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Meta />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <React.Suspense>
          <RouterDevtools />
          <QueryDevtools />
        </React.Suspense>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
