// The SQL migrations are the source of truth; the Drizzle definitions must describe exactly the same
// columns, or typed queries silently diverge from the database. Covers every table schema.ts defines,
// and every table in schema public must have a definition (`pnpm gen:migration --table` adds both).
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import { createDatabase, migrateUp, type Database } from '../index.ts';
import * as schema from '../schema.ts';

const tables = (Object.values(schema) as unknown[]).filter((t): t is PgTable => is(t, PgTable));
const qualified = (t: PgTable) => {
  const c = getTableConfig(t);
  return `${c.schema ?? 'public'}.${c.name}`;
};

let testDb: TestDatabase;
let database: Database;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('every table in schema public has a Drizzle definition', async () => {
  const res = await database.pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const defined = tables.map(qualified);
  expect(res.rows.map((r) => `public.${r.tablename}`).filter((t) => !defined.includes(t))).toEqual([]);
});

it.each(tables.map((t) => [qualified(t), t] as const))(
  'Drizzle definition of %s matches the migrated table',
  async (name, table) => {
    const res = await database.pool.query<{ column_name: string; is_nullable: 'YES' | 'NO' }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 ORDER BY column_name`,
      name.split('.'),
    );
    const inDb = res.rows.map((r) => `${r.column_name}${r.is_nullable === 'NO' ? ' not null' : ''}`);
    const inDrizzle = getTableConfig(table)
      .columns.map((c) => `${c.name}${c.notNull ? ' not null' : ''}`)
      .sort();
    expect(inDrizzle).toEqual(inDb);
  },
);
