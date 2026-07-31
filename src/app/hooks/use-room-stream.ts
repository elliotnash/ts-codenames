import { useEffect, useRef } from 'react';
import type { z } from 'zod';
import { type DuetSide, ServerEventSchema } from '~/lib/room-events';

/**
 * Subscribe to a room's SSE stream. The declared side rides on the URL, so the
 * server can personalize fullState events; changing it reconnects and the fresh
 * snapshot delivers that side's key.
 */
export function useRoomStream(
  code: string,
  side: DuetSide | null,
  enabled: boolean,
  onEvent: (event: z.output<typeof ServerEventSchema>) => void,
) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const source = new EventSource(`/api/rooms/${code}/events${side ? `?side=${side}` : ''}`);
    source.addEventListener('message', (event) => {
      try {
        const { data } = ServerEventSchema.safeParse(JSON.parse(event.data));
        if (data) handler.current(data);
      } catch {
        console.log("Couldn't parse SSE message:", event.data);
      }
    });
    return () => source.close();
  }, [code, side, enabled]);
}
