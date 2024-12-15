import type { DB } from 'kysely-codegen';
import pg from 'pg';
const { Pool } = pg;
import { Kysely, PostgresDialect } from 'kysely';
import { privateEnv } from '@/env';

export const pool = new Pool({
  database: privateEnv().dbName,
  host: privateEnv().dbHost,
  password: privateEnv().dbPassword,
  port: privateEnv().dbPort,
  user: privateEnv().dbUser,
  ssl: privateEnv().dbSsl,
  max: 10,
});

const dialect = new PostgresDialect({
  pool,
});

export const db = new Kysely<DB>({ dialect });
