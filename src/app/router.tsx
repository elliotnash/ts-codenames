import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import { routeTree } from './route-tree.gen';
// import { posthog } from 'posthog-js';
// import { PostHogProvider } from 'posthog-js/react';

// posthog.init(publicEnv().posthogKey, {
//   api_host: publicEnv().posthogHost,
//   person_profiles: 'identified_only',
//   persistence: 'cookie',
// });

export interface RouterContext {
  queryClient: QueryClient;
}

export function createRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });

  const routerContext: RouterContext = {
    queryClient,
  };

  const router = createTanStackRouter({
    routeTree,
    context: routerContext,
    defaultPreload: 'intent',
    // Wrap: ({ children }) => {
    //   return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
    // },
  });

  // expose router and query client to window for use outside React (e.g. for Better Auth)
  if (typeof window !== 'undefined') {
    window.getRouter = () => router;
    window.getQueryClient = () => queryClient;
  }

  return routerWithQueryClient(router, queryClient);
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

declare global {
  interface Window {
    getRouter: () => ReturnType<typeof createRouter>;
    getQueryClient: () => QueryClient;
  }
}
