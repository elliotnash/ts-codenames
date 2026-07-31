import { z } from 'zod';
import { type DuetSide, DuetSideSchema } from '~/lib/room-events';

// Per-room view preferences, kept in cookies so the server already knows them
// during SSR (board vs. picker — no hydration flash). Room codes are [a-z0-9-],
// so they're safe inside a cookie name.

export const ClassicRoleSchema = z.enum(['operative', 'spymaster']);
export type ClassicRole = z.infer<typeof ClassicRoleSchema>;

export function duetSideCookieName(code: string) {
  return `duet_side_${code}`;
}

export function classicRoleCookieName(code: string) {
  return `classic_role_${code}`;
}

function readCookie(headers: Headers, name: string): string | undefined {
  const prefix = `${name}=`;
  return (headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

/** The viewer's declared duet side for a room, from the request cookies. */
export function duetSideFromHeaders(headers: Headers, code: string): DuetSide | null {
  const value = readCookie(headers, duetSideCookieName(code));
  return DuetSideSchema.nullable()
    .catch(null)
    .parse(value ?? null);
}

/** The viewer's declared classic role for a room, from the request cookies. */
export function classicRoleFromHeaders(headers: Headers, code: string): ClassicRole | null {
  const value = readCookie(headers, classicRoleCookieName(code));
  return ClassicRoleSchema.nullable()
    .catch(null)
    .parse(value ?? null);
}
