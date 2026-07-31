import { type DuetSide, DuetSideSchema } from '~/lib/room-events';

// Room codes are [a-z0-9-], so they're safe inside a cookie name.
export function duetSideCookieName(code: string) {
  return `duet_side_${code}`;
}

/** Read the viewer's declared duet side for a room from the request cookies. */
export function duetSideFromHeaders(headers: Headers, code: string): DuetSide | null {
  const prefix = `${duetSideCookieName(code)}=`;
  const value = (headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return DuetSideSchema.nullable()
    .catch(null)
    .parse(value ?? null);
}
