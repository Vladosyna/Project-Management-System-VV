// commercial_record_site_link — RLS and integrity (D-44): internal only; a batch PO links further stores of the same
// client; a store is linked once per record while active.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  commercialRecord,
  commercialRecordSite,
  createDatabase,
  inActorTransaction,
  migrateUp,
  site,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const clientB = randomUUID();
const [site1, site2, siteOfB] = [randomUUID(), randomUUID(), randomUUID()];
const po = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const link = (more: Partial<typeof commercialRecordSite.$inferInsert> = {}) => ({
  recordId: po,
  clientId: clientA,
  siteId: site2,
  createdBy: staff.id,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const seen = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => (await tx.select().from(commercialRecordSite)).length);
const store = (id: string, clientId: string, no: number) => ({
  id,
  clientId,
  projectId: `CLIENT${clientId === clientA ? 'A' : 'B'}-ES-MAD-00${String(no)}`,
  countryCode: 'ES',
  cityCode: 'MAD',
  cityName: 'Madrid',
  runningNo: no,
  name: `Store 00${String(no)}`,
  standard: 'S' as const,
});

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
  await asStaff(async (tx) => {
    await tx.insert(client).values([
      { id: clientA, shortCode: 'CLIENTA', name: 'Client A' },
      { id: clientB, shortCode: 'CLIENTB', name: 'Client B' },
    ]);
    await tx
      .insert(site)
      .values([store(site1, clientA, 1), store(site2, clientA, 2), store(siteOfB, clientB, 3)]);
    await tx.insert(commercialRecord).values({
      id: po,
      clientId: clientA,
      siteId: site1,
      kind: 'client_po',
      reference: 'PO-1',
      status: 'received',
      recordDate: '2026-11-20',
      proposedBy: staff.id,
      proposedVia: 'web',
    });
    await tx.insert(commercialRecordSite).values(link());
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see the links; clients and partners never do', async () => {
  expect([await seen(staff), await seen(userOfA), await seen(partnerOfA)]).toEqual([1, 0, 0]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) =>
      tx.insert(commercialRecordSite).values(link({ siteId: site1 })),
    ),
  ).rejects.toThrow();
});

it('a store is linked once while active; never a store of another client', async () => {
  await expect(asStaff((tx) => tx.insert(commercialRecordSite).values(link()))).rejects.toThrow();
  await expect(
    asStaff((tx) => tx.insert(commercialRecordSite).values(link({ siteId: siteOfB, clientId: clientB }))),
  ).rejects.toThrow();
  await expect(
    asStaff((tx) => tx.insert(commercialRecordSite).values(link({ siteId: siteOfB }))),
  ).rejects.toThrow();
  await asStaff((tx) => tx.insert(commercialRecordSite).values(link({ archivedAt: new Date() })));
});
