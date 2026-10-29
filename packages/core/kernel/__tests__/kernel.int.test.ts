// F0.7: the one write path end to end against PostgreSQL with RLS on (02-architecture §3, 04-testing §3 audit).
// `probe_note` is a test-only client-data table built like every future business table.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { createDatabase, migrateUp, type Database } from '@ocs/db';
import type { Actor } from '@ocs/contracts';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  createKernel,
  defineCommand,
  defineQuery,
  Forbidden,
  permission,
  RuleViolation,
  ValidationFailed,
  type Kernel,
  type PermissionKey,
} from '../index.ts';

const clientA = randomUUID();
const clientB = randomUUID();
const staff: Actor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const clientUser: Actor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const fixedNow = new Date('2026-11-02T09:00:00Z');

const canCreate = permission('probe.note.create');
const canRead = permission('probe.note.read');

const createNote = defineCommand({
  name: 'probe.note.create',
  permission: canCreate,
  input: z.object({ clientId: z.uuid(), body: z.string().min(1) }),
  describe: (i) => `Create probe note for client ${i.clientId}`,
  handle: async (ctx, i) => {
    if (i.body === 'forbidden by rule') throw new RuleViolation('SOP-TEST §1', 'probe rule');
    const id = ctx.newId();
    await ctx.tx.execute(
      sql`INSERT INTO probe_note (id, client_id, body) VALUES (${id}, ${i.clientId}, ${i.body})`,
    );
    ctx.emit('probe.note.created', { id }, i.clientId);
    return {
      result: id,
      audit: {
        objectType: 'probe_note',
        objectId: id,
        clientId: i.clientId,
        before: null,
        after: { body: i.body },
      },
    };
  },
});

const listNotes = defineQuery({
  name: 'probe.note.list',
  permission: canRead,
  input: z.object({}),
  handle: async (ctx) => {
    const res = await ctx.tx.execute<{ body: string }>(sql`SELECT body FROM probe_note ORDER BY body`);
    return res.rows.map((r) => r.body);
  },
});

const writeInQuery = defineQuery({
  name: 'probe.note.sneakyWrite',
  permission: canRead,
  input: z.object({}),
  handle: async (ctx) => {
    await ctx.tx.execute(
      sql`INSERT INTO probe_note (id, client_id, body) VALUES (${randomUUID()}, ${clientA}, 'x')`,
    );
    return 'written';
  },
});

let testDb: TestDatabase;
let database: Database;
let granted: Map<string, Set<PermissionKey>>;
let kernel: Kernel;

async function count(table: 'probe_note' | 'audit_event' | 'outbox'): Promise<number> {
  // As the owner: bypasses RLS, so this sees what was really written.
  const res = await database.pool.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(res.rows[0]?.n);
}

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
  await database.pool.query(`
    CREATE TABLE probe_note (id uuid PRIMARY KEY, client_id uuid NOT NULL, body text NOT NULL, archived_at timestamptz);
    ALTER TABLE probe_note ENABLE ROW LEVEL SECURITY;
    CREATE POLICY probe_note_internal ON probe_note FOR ALL TO ocs_app USING (app.is_internal()) WITH CHECK (app.is_internal());
    CREATE POLICY probe_note_client_read ON probe_note FOR SELECT TO ocs_app USING (client_id = ANY (app.client_ids()));
    GRANT SELECT, INSERT, UPDATE ON probe_note TO ocs_app;
  `);
  granted = new Map();
  kernel = createKernel({
    db: database.db,
    permissions: { has: (actor, key) => granted.get(actor.id)?.has(key) ?? false },
    clock: () => fixedNow,
  });
});

beforeEach(async () => {
  granted.set(staff.id, new Set([canCreate, canRead]));
  granted.set(clientUser.id, new Set([canRead]));
  await database.pool.query(`ALTER TABLE audit_event DISABLE TRIGGER audit_event_append_only`);
  await database.pool.query(`TRUNCATE probe_note, audit_event, outbox`);
  await database.pool.query(`ALTER TABLE audit_event ENABLE TRIGGER audit_event_append_only`);
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

describe('execute(command)', () => {
  it('writes the change, exactly one audit record and the outbox event in one transaction', async () => {
    const id = await kernel.execute(createNote, staff, { clientId: clientA, body: 'hello' }, 'test');

    const audit = await database.pool.query(`SELECT * FROM audit_event`);
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      actor_id: staff.id,
      actor_kind: 'staff',
      command: 'probe.note.create',
      description: `Create probe note for client ${clientA}`,
      object_type: 'probe_note',
      object_id: id,
      client_id: clientA,
      before: null,
      after: { body: 'hello' },
      source: 'test',
      at: fixedNow,
    });
    const events = await database.pool.query(`SELECT event_type, payload, client_id FROM outbox`);
    expect(events.rows).toEqual([{ event_type: 'probe.note.created', payload: { id }, client_id: clientA }]);
    expect(await count('probe_note')).toBe(1);
  });

  it('records the AI channel when an agent acts for the user', async () => {
    await kernel.execute(
      createNote,
      { ...staff, via: 'mcp:claude' },
      { clientId: clientA, body: 'x' },
      'mcp',
    );
    const audit = await database.pool.query(`SELECT actor_via, source FROM audit_event`);
    expect(audit.rows).toEqual([{ actor_via: 'mcp:claude', source: 'mcp' }]);
  });

  it('refuses without the permission and writes nothing (deny by default)', async () => {
    await expect(
      kernel.execute(createNote, clientUser, { clientId: clientA, body: 'hello' }, 'test'),
    ).rejects.toBeInstanceOf(Forbidden);
    expect([await count('probe_note'), await count('audit_event'), await count('outbox')]).toEqual([0, 0, 0]);
  });

  it('refuses invalid input with the failing fields and writes nothing', async () => {
    const attempt = kernel.execute(createNote, staff, { clientId: 'not-a-uuid', body: '' }, 'test');
    await expect(attempt).rejects.toBeInstanceOf(ValidationFailed);
    await expect(attempt).rejects.toMatchObject({
      issues: expect.arrayContaining([expect.objectContaining({ path: 'clientId' })]) as unknown,
    });
    expect(await count('audit_event')).toBe(0);
  });

  it('rolls back everything when a rule refuses the change, keeping the SOP clause', async () => {
    const attempt = kernel.execute(
      createNote,
      staff,
      { clientId: clientA, body: 'forbidden by rule' },
      'test',
    );
    await expect(attempt).rejects.toMatchObject({ clause: 'SOP-TEST §1' });
    expect([await count('probe_note'), await count('audit_event'), await count('outbox')]).toEqual([0, 0, 0]);
  });
});

describe('read(query)', () => {
  it('a client actor sees only its own client’s rows (RLS through the kernel)', async () => {
    await kernel.execute(createNote, staff, { clientId: clientA, body: 'for A' }, 'test');
    await kernel.execute(createNote, staff, { clientId: clientB, body: 'for B' }, 'test');

    expect(await kernel.read(listNotes, clientUser, {})).toEqual(['for A']);
    expect(await kernel.read(listNotes, staff, {})).toEqual(['for A', 'for B']);
  });

  it('runs read-only: a query cannot write', async () => {
    await expect(kernel.read(writeInQuery, staff, {})).rejects.toMatchObject({ cause: { code: '25006' } });
    expect(await count('probe_note')).toBe(0);
  });

  it('refuses without the permission', async () => {
    granted.set(clientUser.id, new Set());
    await expect(kernel.read(listNotes, clientUser, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
