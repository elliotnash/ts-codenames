import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { sql } from 'kysely';
import { z } from 'zod';
import { BOARD_SIZE, dealBoard, unionBucketWords } from '~/lib/deal';
import { db } from '~/lib/db';
import { grantRoomAccess, hashRoomPassword, hasRoomAccess, verifyRoomPassword } from '~/lib/room-access';
import { generateRoomCode, ROOM_CODE_REGEX } from '~/lib/room-codes';
import type { Category, Team } from '~/lib/room-events';
import { broadcast, closeRoom } from '~/lib/room-state';
import { getSessionUser, requestHeaders, requireUser } from '~/lib/session';
import { ensureSystemBuckets } from '~/lib/system-buckets';

const RoomCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .regex(ROOM_CODE_REGEX, 'Codes are 3-24 lowercase letters, digits, and inner hyphens'),
  );

function findRoomByCode(code: string) {
  return db.selectFrom('room').selectAll().where('code', '=', code.toLowerCase()).executeTakeFirst();
}

async function requireRoomByCode(code: string) {
  const room = await findRoomByCode(code);
  if (!room) throw notFound();
  return room;
}

/** Load buckets by id, ensuring they're all visible to the user (own or system). */
async function getVisibleBuckets(bucketIds: string[], userId: string) {
  const buckets = await db
    .selectFrom('word_bucket')
    .select(['id', 'words'])
    .where('id', 'in', bucketIds)
    .where((eb) => eb.or([eb('ownerId', 'is', null), eb('ownerId', '=', userId)]))
    .execute();
  if (buckets.length !== bucketIds.length) {
    throw new Error('One or more selected word buckets could not be found');
  }
  return buckets;
}

function requireUnion(buckets: { words: string[] }[]) {
  const union = unionBucketWords(buckets);
  if (union.length < BOARD_SIZE) {
    throw new Error(
      `The selected buckets only contain ${union.length} unique words — at least ${BOARD_SIZE} are needed`,
    );
  }
  return union;
}

export const checkCodeAvailable = createServerFn()
  .validator(z.object({ code: z.string() }))
  .handler(async ({ data }) => {
    const parsed = RoomCodeSchema.safeParse(data.code);
    if (!parsed.success) return { valid: false as const, available: false };
    const taken = await findRoomByCode(parsed.data);
    return { valid: true as const, available: !taken };
  });

export const createRoom = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      code: RoomCodeSchema.optional(),
      bucketIds: z.array(z.string()).min(1),
      password: z.string().min(1).max(128).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    await ensureSystemBuckets();
    const buckets = await getVisibleBuckets(data.bucketIds, user.id);
    const union = requireUnion(buckets);

    let code: string;
    if (data.code) {
      if (await findRoomByCode(data.code)) throw new Error('That room code is already taken');
      code = data.code;
    } else {
      code = await generateAvailableCode();
    }

    const startingTeam: Team = Math.random() < 0.5 ? 'red' : 'blue';
    const board = dealBoard(union, startingTeam);
    const roomId = crypto.randomUUID();

    await db
      .insertInto('room')
      .values({
        id: roomId,
        code,
        ownerId: user.id,
        passwordHash: data.password ? await hashRoomPassword(data.password) : null,
        words: board.words,
        categories: board.categories,
        startingTeam,
      })
      .execute();
    await db
      .insertInto('room_bucket')
      .values(data.bucketIds.map((bucketId) => ({ roomId, bucketId })))
      .execute();

    return { code };
  });

async function generateAvailableCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateRoomCode(attempt >= 10);
    if (!(await findRoomByCode(code))) return code;
  }
  throw new Error('Could not generate a room code, please try again');
}

export const getRoom = createServerFn()
  .validator(z.object({ code: z.string() }))
  .handler(async ({ data }) => {
    const room = await requireRoomByCode(data.code);
    if (!(await hasRoomAccess(room, requestHeaders()))) {
      return { status: 'needsPassword' as const, code: room.code };
    }

    const user = await getSessionUser();
    const bucketRows = await db
      .selectFrom('room_bucket')
      .select('bucketId')
      .where('roomId', '=', room.id)
      .execute();

    return {
      status: 'ok' as const,
      room: {
        code: room.code,
        deal: room.deal,
        startingTeam: room.startingTeam as Team,
        words: room.words,
        categories: room.categories as Category[],
        revealed: room.revealed,
        isOwner: user?.id === room.ownerId,
        hasPassword: room.passwordHash !== null,
        bucketIds: bucketRows.map((row) => row.bucketId),
      },
    };
  });

export const submitRoomPassword = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const room = await requireRoomByCode(data.code);
    if (!room.passwordHash) return { ok: true };
    const ok = await verifyRoomPassword(room.passwordHash, data.password);
    if (ok) grantRoomAccess(room);
    return { ok };
  });

export const revealCard = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      code: z.string(),
      card: z.number().int().min(0).max(24),
      deal: z.number().int().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const room = await requireRoomByCode(data.code);
    if (!(await hasRoomAccess(room, requestHeaders()))) throw new Error('Access denied');

    // Atomic append; the deal predicate drops reveals that raced a re-deal.
    const result = await db
      .updateTable('room')
      .set({ revealed: sql`array_append(${sql.ref('revealed')}, ${data.card})` })
      .where('id', '=', room.id)
      .where('deal', '=', data.deal)
      .where(sql<boolean>`NOT (${data.card} = ANY(${sql.ref('revealed')}))`)
      .returning('revealed')
      .executeTakeFirst();

    if (result) {
      broadcast(room.id, { type: 'revealedUpdate', deal: data.deal, revealed: result.revealed });
    }
  });

export const newGame = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string() }))
  .handler(async ({ data }) => {
    const room = await requireRoomByCode(data.code);
    if (!(await hasRoomAccess(room, requestHeaders()))) throw new Error('Access denied');

    const buckets = await db
      .selectFrom('word_bucket')
      .innerJoin('room_bucket', 'room_bucket.bucketId', 'word_bucket.id')
      .select('word_bucket.words')
      .where('room_bucket.roomId', '=', room.id)
      .execute();
    const union = requireUnion(buckets);

    const startingTeam: Team = room.startingTeam === 'red' ? 'blue' : 'red';
    const board = dealBoard(union, startingTeam);

    const updated = await db
      .updateTable('room')
      .set({
        words: board.words,
        categories: board.categories,
        startingTeam,
        revealed: [],
        deal: sql<number>`${sql.ref('deal')} + 1`,
      })
      .where('id', '=', room.id)
      .returning('deal')
      .executeTakeFirstOrThrow();

    broadcast(room.id, {
      type: 'fullState',
      deal: updated.deal,
      startingTeam,
      words: board.words,
      categories: board.categories,
      revealed: [],
    });
  });

export const getUserRooms = createServerFn().handler(async () => {
  const user = await requireUser();
  const rooms = await db
    .selectFrom('room')
    .select(['id', 'code', 'passwordHash', 'deal', 'createdAt'])
    .where('ownerId', '=', user.id)
    .orderBy('createdAt', 'desc')
    .execute();

  const buckets =
    rooms.length === 0
      ? []
      : await db
          .selectFrom('room_bucket')
          .innerJoin('word_bucket', 'word_bucket.id', 'room_bucket.bucketId')
          .select(['room_bucket.roomId', 'room_bucket.bucketId', 'word_bucket.name'])
          .where(
            'room_bucket.roomId',
            'in',
            rooms.map((room) => room.id),
          )
          .execute();

  return rooms.map((room) => ({
    id: room.id,
    code: room.code,
    hasPassword: room.passwordHash !== null,
    deal: room.deal,
    buckets: buckets
      .filter((bucket) => bucket.roomId === room.id)
      .map((bucket) => ({ id: bucket.bucketId, name: bucket.name })),
  }));
});

export const updateRoomSettings = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      roomId: z.string(),
      bucketIds: z.array(z.string()).min(1),
      password: z.discriminatedUnion('action', [
        z.object({ action: z.literal('keep') }),
        z.object({ action: z.literal('remove') }),
        z.object({ action: z.literal('set'), value: z.string().min(1).max(128) }),
      ]),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const room = await db
      .selectFrom('room')
      .selectAll()
      .where('id', '=', data.roomId)
      .where('ownerId', '=', user.id)
      .executeTakeFirst();
    if (!room) throw new Error('Room not found');

    await ensureSystemBuckets();
    const buckets = await getVisibleBuckets(data.bucketIds, user.id);
    requireUnion(buckets);

    await db.deleteFrom('room_bucket').where('roomId', '=', room.id).execute();
    await db
      .insertInto('room_bucket')
      .values(data.bucketIds.map((bucketId) => ({ roomId: room.id, bucketId })))
      .execute();

    if (data.password.action === 'set') {
      // Bumping passwordGeneration invalidates every outstanding access grant.
      await db
        .updateTable('room')
        .set({
          passwordHash: await hashRoomPassword(data.password.value),
          passwordGeneration: room.passwordGeneration + 1,
        })
        .where('id', '=', room.id)
        .execute();
    } else if (data.password.action === 'remove') {
      await db
        .updateTable('room')
        .set({ passwordHash: null, passwordGeneration: room.passwordGeneration + 1 })
        .where('id', '=', room.id)
        .execute();
    }
  });

export const deleteRoom = createServerFn({ method: 'POST' })
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const result = await db
      .deleteFrom('room')
      .where('id', '=', data.roomId)
      .where('ownerId', '=', user.id)
      .executeTakeFirst();
    if (result.numDeletedRows === 0n) throw new Error('Room not found');
    closeRoom(data.roomId);
  });
