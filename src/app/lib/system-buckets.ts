import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BucketFileSchema } from '~/lib/bucket-schema';
import { db } from '~/lib/db';

const BUCKETS_DIR = 'data/word-buckets';

async function syncSystemBuckets() {
  const files = (await fs.readdir(BUCKETS_DIR)).filter((file) => file.endsWith('.json'));
  const keys: string[] = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(BUCKETS_DIR, file), 'utf-8');
    const parsed = BucketFileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.error(`Skipping invalid system bucket ${file}:`, parsed.error.message);
      continue;
    }
    const systemKey = file.replace(/\.json$/, '');
    keys.push(systemKey);

    const bucket = {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      language: parsed.data.language ?? null,
      author: parsed.data.author ?? null,
      words: parsed.data.words,
      updatedAt: new Date(),
    };
    await db
      .insertInto('word_bucket')
      .values({ id: crypto.randomUUID(), systemKey, ...bucket })
      .onConflict((oc) => oc.column('systemKey').doUpdateSet(bucket))
      .execute();
  }

  // Remove system buckets whose file no longer exists in the repo.
  let cleanup = db.deleteFrom('word_bucket').where('systemKey', 'is not', null);
  if (keys.length > 0) {
    cleanup = cleanup.where('systemKey', 'not in', keys);
  }
  await cleanup.execute();
}

let synced: Promise<void> | undefined;

// TanStack Start has no server-boot hook, so bucket/room server fns await this
// memoized promise; the sync runs once per process and is idempotent.
export function ensureSystemBuckets() {
  synced ??= syncSystemBuckets().catch((error) => {
    synced = undefined;
    throw error;
  });
  return synced;
}
