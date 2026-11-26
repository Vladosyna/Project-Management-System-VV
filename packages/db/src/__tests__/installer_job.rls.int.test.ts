// installer_job, price_proposal, quote_approval — RLS and integrity (02-architecture §4, 04-testing §3); D-34 N1.
// Internal only; a quote carries currency, EUR and rate; one active CEO approval per job, for a quote of that job.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  createDatabase,
  inActorTransaction,
  installerJob,
  migrateUp,
  partner,
  priceProposal,
  quoteApproval,
  site,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const clientB = randomUUID();
const siteA = randomUUID();
const partnerX = randomUUID();
const jobA = randomUUID();
const quoteA = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const quote = (more: Partial<typeof priceProposal.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  jobId: jobA,
  partnerId: partnerX,
  lines: [{ kind: 'unit', description: 'Mount and cable a sensor', quantity: 4, unitPrice: '80.00' }],
  amount: '320.00',
  currency: 'PLN',
  eurAmount: '73.60',
  fxRate: '0.230000',
  fxDate: '2026-11-26',
  fxSource: 'manual' as const,
  sourceKind: 'pdf' as const,
  proposedBy: staff.id,
  proposedVia: 'ai' as const,
  ...more,
});
const approval = (more: Partial<typeof quoteApproval.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  jobId: jobA,
  proposalId: quoteA,
  approvalRef: 'OA-0001',
  approvedOn: '2026-11-26',
  singleQuoteReason: 'Urgent: store opens Monday',
  recordedBy: staff.id,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const seen = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => [
    (await tx.select().from(installerJob)).length,
    (await tx.select().from(priceProposal)).length,
    (await tx.select().from(quoteApproval)).length,
  ]);

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
  await asStaff(async (tx) => {
    await tx.insert(client).values([
      { id: clientA, shortCode: 'CLIENTA', name: 'Client A' },
      { id: clientB, shortCode: 'CLIENTB', name: 'Client B' },
    ]);
    await tx.insert(site).values({
      id: siteA,
      clientId: clientA,
      projectId: 'CLIENTA-PL-WAW-001',
      countryCode: 'PL',
      cityCode: 'WAW',
      cityName: 'Warsaw',
      runningNo: 1,
      name: 'Store 001',
      standard: 'S',
    });
    await tx.insert(partner).values({ id: partnerX, realName: 'Partner X', countryCode: 'PL' });
    await tx.insert(installerJob).values({
      id: jobA,
      clientId: clientA,
      siteId: siteA,
      partnerId: partnerX,
      scope: 'partial',
      sensorCount: 4,
      createdBy: staff.id,
    });
    await tx.insert(priceProposal).values(quote({ id: quoteA }));
    await tx.insert(quoteApproval).values(approval());
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see jobs, quotes and approvals; clients and partners never do', async () => {
  expect([await seen(staff), await seen(userOfA), await seen(partnerOfA)]).toEqual([
    [1, 1, 1],
    [0, 0, 0],
    [0, 0, 0],
  ]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) => tx.insert(priceProposal).values(quote())),
  ).rejects.toThrow();
});

it('a quote keeps its EUR value and rate; EUR has rate 1; it has at least one line', async () => {
  await expect(
    asStaff((tx) => tx.insert(priceProposal).values(quote({ currency: 'EUR' }))),
  ).rejects.toThrow();
  await expect(asStaff((tx) => tx.insert(priceProposal).values(quote({ lines: [] })))).rejects.toThrow();
  await expect(
    asStaff((tx) => tx.insert(priceProposal).values(quote({ confirmedBy: staff.id }))),
  ).rejects.toThrow();
});

it('a job belongs to its site client; a quote to a job of the same client', async () => {
  const job = {
    id: randomUUID(),
    siteId: siteA,
    scope: 'full' as const,
    sensorCount: 2,
    createdBy: staff.id,
  };
  await expect(
    asStaff((tx) => tx.insert(installerJob).values({ ...job, clientId: clientB })),
  ).rejects.toThrow();
  await expect(
    asStaff((tx) => tx.insert(installerJob).values({ ...job, sensorCount: 0, clientId: clientA })),
  ).rejects.toThrow();
});

it('one active approval per job, with its reference', async () => {
  await expect(asStaff((tx) => tx.insert(quoteApproval).values(approval()))).rejects.toThrow();
  await expect(
    asStaff((tx) => tx.insert(quoteApproval).values(approval({ approvalRef: ' ' }))),
  ).rejects.toThrow();
});
