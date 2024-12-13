import { ThemeProvider } from '~/components/theme';
import styles from '~/globals.css?url';
import { createRootRoute } from '@tanstack/react-router';
import { Outlet, ScrollRestoration } from '@tanstack/react-router';
import { Meta, Scripts } from '@tanstack/start';
import * as React from 'react';

export const Route = createRootRoute({
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
  const TanStackRouterDevtools =
    // publicEnv().mode === 'production'
    // biome-ignore lint/correctness/noConstantCondition: <explanation>
    true
      ? () => null // Render nothing in production
      : React.lazy(async () => {
          // Lazy load in development
          const { TanStackRouterDevtools } = await import('@tanstack/router-devtools');
          return { default: TanStackRouterDevtools };
        });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Meta />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <React.Suspense>
          <TanStackRouterDevtools />
        </React.Suspense>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
