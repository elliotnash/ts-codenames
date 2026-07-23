import { createHmac, timingSafeEqual } from 'node:crypto';
import { setResponseHeader } from '@tanstack/react-start/server';
import { privateEnv } from '@/env';
import { auth } from '~/lib/auth';

type RoomAccess = {
  id: string;
  ownerId: string;
  passwordHash: string | null;
  passwordGeneration: number;
};

export async function hashRoomPassword(password: string) {
  return (await auth.$context).password.hash(password);
}

export async function verifyRoomPassword(hash: string, password: string) {
  return (await auth.$context).password.verify({ hash, password });
}

// Grants are stateless: bumping passwordGeneration on password change invalidates them all.
function roomGrantToken(roomId: string, passwordGeneration: number) {
  return createHmac('sha256', privateEnv().betterAuthSecret)
    .update(`room:${roomId}:${passwordGeneration}`)
    .digest('hex');
}

function cookieName(roomId: string) {
  return `room_access_${roomId.replaceAll('-', '')}`;
}

/** Set a long-lived access-grant cookie for the room on the current response. */
export function grantRoomAccess(room: RoomAccess) {
  const token = roomGrantToken(room.id, room.passwordGeneration);
  setResponseHeader(
    'set-cookie',
    `${cookieName(room.id)}=${token}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax`,
  );
}

function getCookie(headers: Headers, name: string) {
  const header = headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

export async function hasRoomAccess(room: RoomAccess, headers: Headers) {
  if (room.passwordHash === null) return true;

  const token = getCookie(headers, cookieName(room.id));
  if (token) {
    const expected = roomGrantToken(room.id, room.passwordGeneration);
    if (token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  const session = await auth.api.getSession({ headers });
  return session?.user.id === room.ownerId;
}
