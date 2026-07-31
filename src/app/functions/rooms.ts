import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { sql } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { db } from '~/lib/db';
import { BOARD_SIZE, unionBucketWords } from '~/lib/deal';
import { type RoomBoardRow, buildDuetPublicState, buildGameState } from '~/lib/game-state';
import { DUET_TOTAL_AGENTS, dealGame } from '~/lib/modes';
import {
  grantRoomAccess,
  hasRoomAccess,
  hashRoomPassword,
  verifyRoomPassword,
} from '~/lib/room-access';
import { ROOM_CODE_REGEX, generateRoomCode } from '~/lib/room-codes';
import { type DuetCard, DuetSideSchema, type GameMode, GameModeSchema } from '~/lib/room-events';
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
  return db
    .selectFrom('room')
    .selectAll()
    .where('code', '=', code.toLowerCase())
    .executeTakeFirst();
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
      mode: GameModeSchema.default('classic'),
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

    const board = dealGame(data.mode, union);
    const roomId = crypto.randomUUID();

    await db
      .insertInto('room')
      .values({
        id: roomId,
        code,
        ownerId: user.id,
        passwordHash: data.password ? await hashRoomPassword(data.password) : null,
        mode: data.mode,
        ...board,
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
        // No side is known here, so a live duet key is never included.
        state: buildGameState(room, null),
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
    if (room.mode !== 'classic') throw new Error('Not a classic room');

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

const DUET_STATE_COLUMNS = [
  'duetAgents',
  'duetBystandersA',
  'duetBystandersB',
  'duetTokens',
  'duetStatus',
  'duetFatalCard',
  'duetFatalSide',
] as const;

export const duetGuess = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      code: z.string(),
      card: z.number().int().min(0).max(24),
      side: DuetSideSchema,
      deal: z.number().int().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const room = await requireRoomByCode(data.code);
    if (!(await hasRoomAccess(room, requestHeaders()))) throw new Error('Access denied');
    if (room.mode !== 'duet') throw new Error('Not a duet room');
    if (room.deal !== data.deal || room.duetStatus !== 'playing') return;

    // A guess resolves against the OTHER side's key. Branching on this read is
    // race-safe: keys are immutable within a deal and the update is deal-guarded.
    const key = data.side === 'a' ? room.duetKeyB : room.duetKeyA;
    const outcome = key?.[data.card] as DuetCard | undefined;
    if (!outcome) throw new Error('Room has no duet board');

    const marks = data.side === 'a' ? ('duetBystandersA' as const) : ('duetBystandersB' as const);
    // All guards re-checked atomically: a card already agent-covered or already
    // bystander-marked by this side can't be guessed again (the other side's
    // marks don't block — that card may even be an assassin for us).
    const guarded = db
      .updateTable('room')
      .where('id', '=', room.id)
      .where('deal', '=', data.deal)
      .where('duetStatus', '=', 'playing')
      .where(sql<boolean>`NOT (${data.card} = ANY(${sql.ref('duetAgents')}))`)
      .where(sql<boolean>`NOT (${data.card} = ANY(${sql.ref(marks)}))`);

    // SET expressions read the pre-update row, so token spend, sudden-death loss,
    // and the win check are all atomic without a transaction.
    const update = match(outcome)
      .with('agent', () =>
        guarded.set({
          duetAgents: sql<number[]>`array_append(${sql.ref('duetAgents')}, ${data.card})`,
          duetStatus: sql<string>`CASE WHEN cardinality(${sql.ref('duetAgents')}) + 1 >= ${DUET_TOTAL_AGENTS} THEN 'won' ELSE ${sql.ref('duetStatus')} END`,
        }),
      )
      .with('bystander', () => {
        // With tokens left this spends one; at zero tokens it's a sudden-death loss.
        const markAppend = sql<
          number[]
        >`CASE WHEN ${sql.ref('duetTokens')} > 0 THEN array_append(${sql.ref(marks)}, ${data.card}) ELSE ${sql.ref(marks)} END`;
        const spendToken = {
          duetTokens: sql<number>`GREATEST(${sql.ref('duetTokens')} - 1, 0)`,
          duetStatus: sql<string>`CASE WHEN ${sql.ref('duetTokens')} = 0 THEN 'lost' ELSE ${sql.ref('duetStatus')} END`,
          duetFatalCard: sql<
            number | null
          >`CASE WHEN ${sql.ref('duetTokens')} = 0 THEN ${data.card} ELSE ${sql.ref('duetFatalCard')} END`,
          duetFatalSide: sql<
            string | null
          >`CASE WHEN ${sql.ref('duetTokens')} = 0 THEN ${data.side} ELSE ${sql.ref('duetFatalSide')} END`,
        };
        return guarded.set(
          data.side === 'a'
            ? { ...spendToken, duetBystandersA: markAppend }
            : { ...spendToken, duetBystandersB: markAppend },
        );
      })
      .with('assassin', () =>
        guarded.set({ duetStatus: 'lost', duetFatalCard: data.card, duetFatalSide: data.side }),
      )
      .exhaustive();

    const result = await update.returning(DUET_STATE_COLUMNS).executeTakeFirst();
    if (result) {
      broadcast(room.id, {
        type: 'duetUpdate',
        deal: data.deal,
        duet: buildDuetPublicState({ ...room, ...result }),
      });
    }
  });

export const endDuetTurn = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string(), deal: z.number().int().min(1) }))
  .handler(async ({ data }) => {
    const room = await requireRoomByCode(data.code);
    if (!(await hasRoomAccess(room, requestHeaders()))) throw new Error('Access denied');
    if (room.mode !== 'duet') throw new Error('Not a duet room');

    const result = await db
      .updateTable('room')
      .set({ duetTokens: sql`${sql.ref('duetTokens')} - 1` })
      .where('id', '=', room.id)
      .where('deal', '=', data.deal)
      .where('duetStatus', '=', 'playing')
      .where('duetTokens', '>', 0)
      .returning(DUET_STATE_COLUMNS)
      .executeTakeFirst();

    if (result) {
      broadcast(room.id, {
        type: 'duetUpdate',
        deal: data.deal,
        duet: buildDuetPublicState({ ...room, ...result }),
      });
    }
  });

/** Re-deal a room's board (optionally switching mode), bump the deal, and broadcast. */
async function redealRoom(room: RoomBoardRow & { id: string }, mode: GameMode, union: string[]) {
  const board = dealGame(mode, union, room);
  const updated = await db
    .updateTable('room')
    .set({ mode, ...board, deal: sql<number>`${sql.ref('deal')} + 1` })
    .where('id', '=', room.id)
    .returning('deal')
    .executeTakeFirstOrThrow();

  const next = { ...room, ...board, mode, deal: updated.deal };
  broadcast(room.id, (subscriber) => ({
    type: 'fullState',
    state: buildGameState(next, subscriber.side),
  }));
}

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

    await redealRoom(room, room.mode as GameMode, union);
  });

export const getUserRooms = createServerFn().handler(async () => {
  const user = await requireUser();
  const rooms = await db
    .selectFrom('room')
    .select(['id', 'code', 'passwordHash', 'deal', 'mode', 'createdAt'])
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
    mode: room.mode as GameMode,
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
      mode: GameModeSchema,
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
    const union = requireUnion(buckets);

    await db.deleteFrom('room_bucket').where('roomId', '=', room.id).execute();
    await db
      .insertInto('room_bucket')
      .values(data.bucketIds.map((bucketId) => ({ roomId: room.id, bucketId })))
      .execute();

    // Switching modes deals a fresh board for the new mode (from the new buckets).
    if (data.mode !== room.mode) {
      await redealRoom(room, data.mode, union);
    }

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
