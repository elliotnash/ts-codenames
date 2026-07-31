import { useLocalStorage } from '@mantine/hooks';
import { type DuetSide, DuetSideSchema } from '~/lib/room-events';

/**
 * The viewer's duet side for a room, persisted per-browser. Hydrated in an
 * effect (SSR-safe), so the first render always sees null.
 */
export function useDuetSide(code: string) {
  return useLocalStorage<DuetSide | null>({
    key: `duet-side-${code}`,
    defaultValue: null,
    serialize: (value) => value ?? '',
    deserialize: (value) =>
      DuetSideSchema.nullable()
        .catch(null)
        .parse(value ?? null),
  });
}
