import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { BucketFileSchema } from '~/lib/bucket-schema';
import { db } from '~/lib/db';
import { requireUser } from '~/lib/session';
import { ensureSystemBuckets } from '~/lib/system-buckets';

export type Bucket = {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  author: string | null;
  words: string[];
  isSystem: boolean;
};

export const getBuckets = createServerFn().handler(async (): Promise<Bucket[]> => {
  const user = await requireUser();
  await ensureSystemBuckets();

  const buckets = await db
    .selectFrom('word_bucket')
    .select(['id', 'name', 'description', 'language', 'author', 'words', 'systemKey'])
    .where((eb) => eb.or([eb('ownerId', 'is', null), eb('ownerId', '=', user.id)]))
    .orderBy('name')
    .execute();

  return buckets.map(({ systemKey, ...bucket }) => ({ ...bucket, isSystem: systemKey !== null }));
});

export const createBucket = createServerFn({ method: 'POST' })
  .validator(BucketFileSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    await db
      .insertInto('word_bucket')
      .values({
        id: crypto.randomUUID(),
        ownerId: user.id,
        name: data.name,
        description: data.description ?? null,
        language: data.language ?? null,
        author: data.author ?? null,
        words: data.words,
      })
      .execute();
  });

export const updateBucket = createServerFn({ method: 'POST' })
  .validator(BucketFileSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const result = await db
      .updateTable('word_bucket')
      .set({
        name: data.name,
        description: data.description ?? null,
        language: data.language ?? null,
        author: data.author ?? null,
        words: data.words,
        updatedAt: new Date(),
      })
      .where('id', '=', data.id)
      .where('ownerId', '=', user.id)
      .executeTakeFirst();
    if (result.numUpdatedRows === 0n) {
      throw new Error('Bucket not found');
    }
  });

export const deleteBucket = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const result = await db
      .deleteFrom('word_bucket')
      .where('id', '=', data.id)
      .where('ownerId', '=', user.id)
      .executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new Error('Bucket not found');
    }
  });
