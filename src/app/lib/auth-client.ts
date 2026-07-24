import { createAuthClient } from 'better-auth/react';
import { adminClient, twoFactorClient } from 'better-auth/client/plugins';
import { getRequestHeaders, setResponseHeader } from '@tanstack/react-start/server';
import { serverOnly$ } from 'vite-env-only/macros';

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      // Fires on any sign-in response with twoFactorRedirect: true. Runs only in
      // the browser (2FA challenges never happen during SSR).
      onTwoFactorRedirect({ twoFactorMethods }) {
        if (typeof window === 'undefined') return;
        const redirect = new URLSearchParams(window.location.search).get('redirect') ?? '/';
        window.getRouter().navigate({
          to: '/two-factor',
          search: {
            redirect,
            totp: twoFactorMethods?.includes('totp') ?? false,
            otp: twoFactorMethods?.includes('otp') ?? false,
          },
        });
      },
    }),
    adminClient(),
  ],
  // baseURL: typeof window === 'undefined' ? privateEnv().betterAuthUrl : window.location.href, // the base url of your auth server,
  fetchOptions: {
    customFetchImpl: serverOnly$(async (input, init) => {
      const res = await fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          ...Object.fromEntries(getRequestHeaders()),
        },
      });
      // Forward only auth cookies (e.g. a refreshed session) to the SSR response.
      const cookies = res.headers.getSetCookie?.() ?? [];
      if (cookies.length) {
        setResponseHeader('set-cookie', cookies);
      }
      return res;
    }),
  },
});
