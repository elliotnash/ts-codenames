import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
// import { posthog } from 'posthog-js';
// import { PostHogProvider } from 'posthog-js/react';

// posthog.init(publicEnv().posthogKey, {
//   api_host: publicEnv().posthogHost,
//   person_profiles: 'identified_only',
//   persistence: 'cookie',
// });

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    // Wrap: ({ children }) => {
    //   return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
    // },
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
