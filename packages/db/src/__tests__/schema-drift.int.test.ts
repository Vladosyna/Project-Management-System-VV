// The SQL migrations are the source of truth; the Drizzle definitions must describe exactly the same
// columns, or typed queries silently diverge from the database.
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  auditEvent,
  authUser,
  createDatabase,
  invitation,
  migrateUp,
  outbox,
  userRole,
  type Database,
} from '../index.ts';

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

it.each(
  [auditEvent, outbox, authUser, invitation, userRole].map((t) => {
    const c = getTableConfig(t as PgTable);
    return [`${c.schema ?? 'public'}.${c.name}`, t] as const;
  }),
)('Drizzle definition of %s matches the migrated table', async (name, table) => {
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
});
