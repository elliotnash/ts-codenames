import { Client } from 'pg';
import { privateEnv } from '@/env';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const db = new Client({
  user: privateEnv().dbUser,
  host: privateEnv().dbHost,
  database: privateEnv().dbName,
  password: privateEnv().dbPassword,
  port: privateEnv().dbPort,
  ssl: privateEnv().dbSsl,
});
await db.connect();

async function ensureVersionTable() {
  await db.query('CREATE TABLE IF NOT EXISTS schema_version (version integer NOT NULL);');
}

async function getSchemaVersion() {
  await ensureVersionTable();
  const result = await db.query('SELECT version FROM schema_version;');
  if (result.rowCount === 0) {
    await setSchemaVersion(0);
    return 0;
  }
  return result.rows[0].version;
}

async function setSchemaVersion(version: number) {
  await ensureVersionTable();
  await db.query('DELETE FROM schema_version;');
  await db.query('INSERT INTO schema_version (version) VALUES ($1);', [version]);
}

// Migration logic
const migrationRegex = /(\d+)(?:_(.+))?\.[s|S][q|Q][l|L]/;
/**
 * Retrieves a map of migration files from the migrations folder.
 *
 * @returns A map of migration files, where the key is the migration number and the value is the file path.
 */
async function getMigrationMap() {
  const migrationsFolder = Bun.fileURLToPath(import.meta.resolve('../migrations'));
  const migrations = await readdir(migrationsFolder);
  return new Map(
    migrations
      .filter((m) => migrationRegex.test(m))
      .map((migration) => {
        return [Number(migrationRegex.exec(migration)![1]), join(migrationsFolder, migration)];
      }),
  );
}

async function runMigration(migrationFile: string) {
  const sql = await Bun.file(migrationFile).text();
  await db.query(sql);
}

const schemaVersion = await getSchemaVersion();
const migrationMap = await getMigrationMap();

const maxMigration = migrationMap.keys().reduce(Math.max);

// Run all new migrations
for (let i = schemaVersion + 1; i <= maxMigration; i++) {
  await runMigration(migrationMap.get(i)!);
  await setSchemaVersion(i);
}

db.end();
