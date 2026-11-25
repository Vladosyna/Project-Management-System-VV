// commercial_record row-level security and integrity (02-architecture §4, 04-testing §3); D-34 N2 (E13). Internal
// only; money always with currency, EUR value and rate; DPIA carries no amount.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  commercialRecord,
  createDatabase,
  inActorTransaction,
  migrateUp,
  site,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const siteA = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const po = (more: Partial<typeof commercialRecord.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  siteId: siteA,
  kind: 'client_po' as const,
  reference: 'PO-0001',
  status: 'received',
  recordDate: '2026-11-20',
  amount: '1200.00',
  currency: 'GBP',
  eurAmount: '1392.00',
  fxRate: '1.160000',
  fxDate: '2026-11-20',
  fxSource: 'manual' as const,
  proposedBy: staff.id,
  proposedVia: 'ai' as const,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const countFor = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => (await tx.select().from(commercialRecord)).length);
const insert = (row: ReturnType<typeof po>) => asStaff((tx) => tx.insert(commercialRecord).values(row));

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
      name: 'Site 001',
      standard: 'S',
    });
    await tx.insert(commercialRecord).values(po());
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see commercial records; clients and partners never do', async () => {
  expect([await countFor(staff), await countFor(userOfA), await countFor(partnerOfA)]).toEqual([1, 0, 0]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) => tx.insert(commercialRecord).values(po())),
  ).rejects.toThrow();
});

it('an amount needs currency, EUR value and rate; EUR has rate 1', async () => {
  await expect(insert(po({ eurAmount: null }))).rejects.toThrow();
  await expect(insert(po({ currency: 'EUR', fxRate: '1.100000' }))).rejects.toThrow();
  await expect(insert(po({ currency: 'gbp' }))).rejects.toThrow();
  await insert(po({ currency: 'EUR', eurAmount: '1200.00', fxRate: '1.000000' }));
});

it('DPIA has a status and no amount; a PO needs its number', async () => {
  const dpia = { kind: 'dpia' as const, reference: null, status: 'approved' };
  const none = { amount: null, currency: null, eurAmount: null, fxRate: null, fxDate: null, fxSource: null };
  await insert(po({ ...dpia, ...none }));
  await expect(insert(po({ ...dpia }))).rejects.toThrow();
  await expect(insert(po({ ...dpia, ...none, status: 'received' }))).rejects.toThrow();
  await expect(insert(po({ reference: null }))).rejects.toThrow();
});

it('confirmation is recorded with who and when together', async () => {
  await expect(insert(po({ confirmedBy: staff.id }))).rejects.toThrow();
  await insert(po({ confirmedBy: staff.id, confirmedAt: new Date() }));
});
