import { useCallback, useState } from 'react';
import { duetSideCookieName } from '~/lib/duet-side';
import type { DuetSide } from '~/lib/room-events';

/**
 * The viewer's duet side for a room, persisted in a per-room cookie so the
 * server already knows it during SSR (board vs. side picker — no flash).
 * `initial` is the side the server read from that cookie for this render.
 */
export function useDuetSide(code: string, initial: DuetSide | null) {
  const [side, setSideState] = useState(initial);
  const setSide = useCallback(
    (next: DuetSide | null) => {
      const name = duetSideCookieName(code);
      document.cookie =
        next === null
          ? `${name}=; Path=/; Max-Age=0; SameSite=Lax`
          : `${name}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setSideState(next);
    },
    [code],
  );
  return [side, setSide] as const;
}
