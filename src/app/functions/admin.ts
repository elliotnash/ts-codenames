import { createServerFn } from '@tanstack/react-start';
import { sql } from 'kysely';
import { z } from 'zod';
import { auth } from '~/lib/auth';
import { db } from '~/lib/db';
import { requestHeaders, requireUser } from '~/lib/session';

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}

export const getAdminUsers = createServerFn().handler(async () => {
  await requireAdmin();
  const users = await db
    .selectFrom('user as u')
    .select([
      'u.id',
      'u.name',
      'u.email',
      'u.emailVerified',
      'u.role',
      'u.twoFactorEnabled',
      'u.createdAt',
      sql<string>`(select count(*) from room r where r."ownerId" = u.id)`.as('roomCount'),
      sql<string>`(select count(*) from word_bucket b where b."ownerId" = u.id)`.as('bucketCount'),
      // pg_column_size over whole rows approximates each user's stored data
      sql<string>`
        coalesce((select sum(pg_column_size(r.*)) from room r where r."ownerId" = u.id), 0)
        + coalesce((select sum(pg_column_size(b.*)) from word_bucket b where b."ownerId" = u.id), 0)
      `.as('storageBytes'),
    ])
    .orderBy('u.createdAt', 'asc')
    .execute();

  return users.map((user) => ({
    ...user,
    roomCount: Number(user.roomCount),
    bucketCount: Number(user.bucketCount),
    storageBytes: Number(user.storageBytes),
  }));
});

/** Invalidate the user's password and sessions, then email them a reset link. */
export const forceResetPassword = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const user = await db
      .selectFrom('user')
      .select(['email'])
      .where('id', '=', data.userId)
      .executeTakeFirst();
    if (!user) throw new Error('User not found');

    const headers = requestHeaders();
    // Random unguessable password invalidates the current one
    const scrambled = crypto.randomUUID() + crypto.randomUUID();
    await auth.api.setUserPassword({
      body: { userId: data.userId, newPassword: scrambled },
      headers,
    });
    await auth.api.revokeUserSessions({ body: { userId: data.userId }, headers });
    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: '/reset-password' },
    });
  });

export const adminDisableTwoFactor = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    // No better-auth admin endpoint for this — clear enrollment directly
    // (also removes pending, unverified enrollments).
    await db.deleteFrom('twoFactor').where('userId', '=', data.userId).execute();
    await db
      .updateTable('user')
      .set({ twoFactorEnabled: false })
      .where('id', '=', data.userId)
      .execute();
  });

export const setUserRole = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string(), role: z.enum(['user', 'admin']) }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (data.userId === admin.id && data.role !== 'admin') {
      throw new Error('You cannot remove your own admin role');
    }
    await auth.api.setRole({
      body: { userId: data.userId, role: data.role },
      headers: requestHeaders(),
    });
  });

export const adminDeleteUser = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (data.userId === admin.id) {
      throw new Error('You cannot delete your own account from the admin page');
    }
    await auth.api.removeUser({ body: { userId: data.userId }, headers: requestHeaders() });
  });
