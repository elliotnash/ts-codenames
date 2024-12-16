import { queryOptions, useQuery } from '@tanstack/react-query';
import { getHeaders } from 'vinxi/http';
import { serverOnly$ } from 'vite-env-only/macros';
import { authClient } from '~/lib/auth-client';

export function useAuthOptions() {
  return queryOptions({
    queryKey: ['auth'],
    queryFn: async () => {
      const session = await authClient.getSession({
        fetchOptions: serverOnly$({
          headers: getHeaders() as Record<string, string>,
        }),
      });
      return {
        isAuthenticated: !!session.data,
        ...session,
      };
    },
  });
}

export function useAuth() {
  const { data, error } = useQuery(useAuthOptions());
  return {
    ...error,
    ...data,
    isAuthenticated: data?.isAuthenticated ?? false,
  };
}
