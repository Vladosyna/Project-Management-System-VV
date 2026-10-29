// RLS suite skeleton (F0.6, 04-testing §3). The catalogue checks run over every table, so each new
// business table is covered the moment its migration lands.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  auditEvent,
  createDatabase,
  inActorTransaction,
  migrateUp,
  outbox,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const system: DbActor = { id: randomUUID(), kind: 'system', clientIds: [] };
const clientUser: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerUser: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };

let testDb: TestDatabase;
let database: Database;

function auditRow(actor: DbActor, clientId: string | null) {
  return {
    id: randomUUID(),
    actorId: actor.id,
    actorKind: actor.kind,
    command: 'test.probe',
    description: 'probe',
    objectType: 'probe',
    objectId: randomUUID(),
    clientId,
    source: 'test',
  };
}

async function rows<T>(query: Promise<T[]>): Promise<number> {
  return (await query).length;
}

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
  await inActorTransaction(database.db, staff, async (tx) => {
    await tx.insert(auditEvent).values([auditRow(staff, clientA), auditRow(staff, null)]);
    await tx
      .insert(outbox)
      .values({ id: randomUUID(), eventType: 'test.probe', payload: {}, clientId: clientA });
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

describe('catalogue guarantees (apply to every table, present and future)', () => {
  it('every table in the public schema has row-level security enabled', async () => {
    const res = await database.pool.query<{ relname: string }>(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`,
    );
    expect(res.rows.map((r) => r.relname)).toEqual([]);
  });

  it('every table with client_id has at least one policy for ocs_app', async () => {
    const res = await database.pool.query<{ table_name: string }>(
      `SELECT c.table_name FROM information_schema.columns c
       WHERE c.table_schema = 'public' AND c.column_name = 'client_id'
         AND NOT EXISTS (SELECT 1 FROM pg_policies p
                         WHERE p.schemaname = 'public' AND p.tablename = c.table_name AND 'ocs_app' = ANY (p.roles))`,
    );
    expect(res.rows.map((r) => r.table_name)).toEqual([]);
  });

  it('ocs_app is not a superuser, cannot bypass RLS and owns no table', async () => {
    const role = await database.pool.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'ocs_app'`,
    );
    expect(role.rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
    const owned = await database.pool.query(`SELECT 1 FROM pg_tables WHERE tableowner = 'ocs_app'`);
    expect(owned.rowCount).toBe(0);
  });

  it('ocs_app has no DELETE or TRUNCATE privilege on any table (archive, never delete)', async () => {
    const res = await database.pool.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type FROM information_schema.role_table_grants
       WHERE grantee = 'ocs_app' AND privilege_type IN ('DELETE', 'TRUNCATE')`,
    );
    expect(res.rows).toEqual([]);
  });
});

describe('deny by default', () => {
  it('a transaction without actor context reads nothing', async () => {
    const counts = await database.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE ocs_app`);
      return [await rows(tx.select().from(auditEvent)), await rows(tx.select().from(outbox))];
    });
    expect(counts).toEqual([0, 0]);
  });
});

describe('audit_event', () => {
  it('staff can read the audit log', async () => {
    const n = await inActorTransaction(database.db, staff, (tx) => rows(tx.select().from(auditEvent)));
    expect(n).toBe(2);
  });

  it.each([
    ['client', clientUser],
    ['partner', partnerUser],
  ])('a %s actor cannot read the audit log, not even rows of its own client', async (_kind, actor) => {
    const n = await inActorTransaction(database.db, actor, (tx) => rows(tx.select().from(auditEvent)));
    expect(n).toBe(0);
  });

  it('an actor cannot write an audit row in someone else’s name', async () => {
    const forged = inActorTransaction(database.db, clientUser, (tx) =>
      tx.insert(auditEvent).values(auditRow(staff, clientA)),
    );
    // 42501 = insufficient_privilege: "new row violates row-level security policy".
    await expect(forged).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  it('is append-only, even for the table owner', async () => {
    await expect(database.pool.query(`UPDATE audit_event SET description = 'x'`)).rejects.toThrow(
      /append-only/,
    );
    await expect(database.pool.query(`DELETE FROM audit_event`)).rejects.toThrow(/append-only/);
  });
});

describe('outbox', () => {
  it('only the system actor reads the outbox', async () => {
    expect(await inActorTransaction(database.db, system, (tx) => rows(tx.select().from(outbox)))).toBe(1);
    expect(await inActorTransaction(database.db, staff, (tx) => rows(tx.select().from(outbox)))).toBe(0);
    expect(await inActorTransaction(database.db, clientUser, (tx) => rows(tx.select().from(outbox)))).toBe(0);
  });
});
