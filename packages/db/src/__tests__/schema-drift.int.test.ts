// The SQL migrations are the source of truth; the Drizzle definitions must describe exactly the same
// columns, or typed queries silently diverge from the database.
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import { auditEvent, createDatabase, migrateUp, outbox, type Database } from '../index.ts';

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

it.each([auditEvent, outbox].map((t) => [getTableConfig(t as PgTable).name, t] as const))(
  'Drizzle definition of %s matches the migrated table',
  async (name, table) => {
    const res = await database.pool.query<{ column_name: string; is_nullable: 'YES' | 'NO' }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name`,
      [name],
    );
    const inDb = res.rows.map((r) => `${r.column_name}${r.is_nullable === 'NO' ? ' not null' : ''}`);
    const inDrizzle = getTableConfig(table)
      .columns.map((c) => `${c.name}${c.notNull ? ' not null' : ''}`)
      .sort();
    expect(inDrizzle).toEqual(inDb);
  },
);
