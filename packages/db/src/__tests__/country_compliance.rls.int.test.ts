// country_compliance — RLS and integrity (D-45): internal only; one active DPIA / LPA per client, country and kind;
// a part of the work on commercial records; the client's compliance scope.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  countryCompliance,
  createDatabase,
  inActorTransaction,
  migrateUp,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const record = (more: Partial<typeof countryCompliance.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  countryCode: 'ES',
  kind: 'lpa' as const,
  status: 'approved' as const,
  recordDate: '2026-11-20',
  proposedBy: staff.id,
  proposedVia: 'web' as const,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const seen = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => (await tx.select().from(countryCompliance)).length);

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
  await asStaff(async (tx) => {
    await tx
      .insert(client)
      .values({ id: clientA, shortCode: 'CLIENTA', name: 'Client A', complianceScope: 'country' });
    await tx.insert(countryCompliance).values(record());
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see country DPIA / LPA; clients and partners never do', async () => {
  expect([await seen(staff), await seen(userOfA), await seen(partnerOfA)]).toEqual([1, 0, 0]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) =>
      tx.insert(countryCompliance).values(record({ kind: 'dpia' })),
    ),
  ).rejects.toThrow();
});

it('one active per client, country and kind; valid country code, kind and status', async () => {
  await expect(asStaff((tx) => tx.insert(countryCompliance).values(record()))).rejects.toThrow();
  await expect(
    asStaff((tx) => tx.insert(countryCompliance).values(record({ countryCode: 'es', kind: 'dpia' }))),
  ).rejects.toThrow();
  await expect(
    asStaff((tx) =>
      tx.insert(countryCompliance).values(record({ kind: 'dpa' as 'dpia', countryCode: 'PT' })),
    ),
  ).rejects.toThrow();
  await asStaff((tx) => tx.insert(countryCompliance).values(record({ archivedAt: new Date() })));
  await asStaff((tx) => tx.insert(countryCompliance).values(record({ kind: 'dpia', status: 'pending' })));
});
