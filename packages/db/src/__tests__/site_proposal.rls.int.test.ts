// site_proposal — RLS and integrity (D-43): internal only; one active proposal per store; versions unique; a
// reference and at least one item.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  createDatabase,
  inActorTransaction,
  migrateUp,
  site,
  siteProposal,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const siteA = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const proposal = (more: Partial<typeof siteProposal.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  siteId: siteA,
  version: 1,
  items: [{ model: 'G6', count: 4 }],
  proposalRef: 'Proposal 2026-01',
  createdBy: staff.id,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const seen = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => (await tx.select().from(siteProposal)).length);

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
  await asStaff(async (tx) => {
    await tx.insert(client).values({ id: clientA, shortCode: 'CLIENTA', name: 'Client A' });
    await tx.insert(site).values({
      id: siteA,
      clientId: clientA,
      projectId: 'CLIENTA-ES-MAD-001',
      countryCode: 'ES',
      cityCode: 'MAD',
      cityName: 'Madrid',
      runningNo: 1,
      name: 'Store 001',
      standard: 'S',
    });
    await tx.insert(siteProposal).values(proposal());
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see proposals; clients and partners never do', async () => {
  expect([await seen(staff), await seen(userOfA), await seen(partnerOfA)]).toEqual([1, 0, 0]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) =>
      tx.insert(siteProposal).values(proposal({ version: 2 })),
    ),
  ).rejects.toThrow();
});

it('one active proposal per store; versions unique; a reference and an item', async () => {
  await expect(asStaff((tx) => tx.insert(siteProposal).values(proposal({ version: 2 })))).rejects.toThrow();
  await expect(
    asStaff((tx) => tx.insert(siteProposal).values(proposal({ version: 1, archivedAt: new Date() }))),
  ).rejects.toThrow();
  await expect(
    asStaff((tx) =>
      tx.insert(siteProposal).values(proposal({ version: 3, items: [], archivedAt: new Date() })),
    ),
  ).rejects.toThrow();
  await expect(
    asStaff((tx) =>
      tx.insert(siteProposal).values(proposal({ version: 4, proposalRef: ' ', archivedAt: new Date() })),
    ),
  ).rejects.toThrow();
  await asStaff((tx) => tx.insert(siteProposal).values(proposal({ version: 5, archivedAt: new Date() })));
});
