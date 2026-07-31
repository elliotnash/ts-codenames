import { useCallback, useState } from 'react';

/**
 * String state persisted in a cookie so the server can render the matching
 * view during SSR. `initial` is the value the server read from that cookie
 * for this render, keeping hydration in sync.
 */
export function useCookieState<T extends string>(name: string, initial: T | null) {
  const [value, setValueState] = useState(initial);
  const setValue = useCallback(
    (next: T | null) => {
      document.cookie =
        next === null
          ? `${name}=; Path=/; Max-Age=0; SameSite=Lax`
          : `${name}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setValueState(next);
    },
    [name],
  );
  return [value, setValue] as const;
}
