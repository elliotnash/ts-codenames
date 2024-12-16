import { createAuthClient } from 'better-auth/react';
import { getHeaders, setHeaders } from 'vinxi/http';
import { serverOnly$ } from 'vite-env-only/macros';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000', // the base url of your auth server,
  fetchOptions: {
    customFetchImpl: serverOnly$(async (input, init) => {
      console.log('custom fetch called!');
      const res = await fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          ...getHeaders(),
        },
      });
      setHeaders(Object.fromEntries(Object.entries(res.headers)));
      return res;
    }),
  },
});
