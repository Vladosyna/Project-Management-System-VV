// 04-testing §3: every migration goes up, down and up again.
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import { createDatabase, listMigrations, migrateDown, migrateUp, type Database } from '../index.ts';

let testDb: TestDatabase;
let database: Database;

async function publicTables(): Promise<string[]> {
  const res = await database.pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  return res.rows.map((r) => r.tablename);
}

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('applies all migrations, reverts them all, and applies them again', async () => {
  const all = listMigrations().map((m) => m.name);
  expect(all.length).toBeGreaterThan(0);

  expect(await migrateUp(database.pool)).toEqual(all);
  const tablesAfterUp = await publicTables();
  expect(tablesAfterUp).toEqual(expect.arrayContaining(['audit_event', 'outbox']));
  expect(await migrateUp(database.pool)).toEqual([]); // idempotent

  expect(await migrateDown(database.pool, all.length)).toEqual([...all].reverse());
  expect(await publicTables()).toEqual([]);

  expect(await migrateUp(database.pool)).toEqual(all);
  expect(await publicTables()).toEqual(tablesAfterUp);
});
