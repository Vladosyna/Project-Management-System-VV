// MI-1 form tables (D-37) — RLS and integrity: internal only; one active request per store and template; one current
// answer per field (a new one supersedes, never overwrites); a store of another client is refused.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  createDatabase,
  formAnswer,
  formField,
  formRequest,
  formTemplate,
  inActorTransaction,
  migrateUp,
  site,
  type Database,
  type DbActor,
} from '../index.ts';

const [clientA, clientB, siteA, template, field, request] = [
  randomUUID(),
  randomUUID(),
  randomUUID(),
  randomUUID(),
  randomUUID(),
  randomUUID(),
];
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const answer = (more: Partial<typeof formAnswer.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  requestId: request,
  fieldId: field,
  value: 'Store manager',
  answeredBy: staff.id,
  answeredVia: 'staff' as const,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const seen = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => [
    (await tx.select().from(formTemplate)).length,
    (await tx.select().from(formRequest)).length,
    (await tx.select().from(formAnswer)).length,
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
      projectId: 'CLIENTA-ES-MAD-001',
      countryCode: 'ES',
      cityCode: 'MAD',
      cityName: 'Madrid',
      runningNo: 1,
      name: 'Store 001',
      standard: 'S',
    });
    await tx
      .insert(formTemplate)
      .values({ id: template, name: 'Market Input', version: 1, createdBy: staff.id });
    await tx.insert(formField).values({
      id: field,
      templateId: template,
      key: 'store_contact',
      section: 'A1',
      sortOrder: 1,
      labelEn: 'Store contact',
      labelZh: '门店联系人',
      type: 'text',
      requirement: 'required',
      answeredBy: 'market',
    });
    await tx
      .insert(formRequest)
      .values({ id: request, clientId: clientA, siteId: siteA, templateId: template, createdBy: staff.id });
    await tx.insert(formAnswer).values(answer());
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see forms; clients and partners never do (the market link comes with MI-3)', async () => {
  expect([await seen(staff), await seen(userOfA), await seen(partnerOfA)]).toEqual([
    [1, 1, 1],
    [0, 0, 0],
    [0, 0, 0],
  ]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) => tx.insert(formAnswer).values(answer())),
  ).rejects.toThrow();
});

it('one request per store and template; one current answer per field; same client only', async () => {
  await expect(
    asStaff((tx) =>
      tx.insert(formRequest).values({
        id: randomUUID(),
        clientId: clientA,
        siteId: siteA,
        templateId: template,
        createdBy: staff.id,
      }),
    ),
  ).rejects.toThrow();
  await expect(asStaff((tx) => tx.insert(formAnswer).values(answer()))).rejects.toThrow();
  await expect(
    asStaff((tx) =>
      tx.insert(formRequest).values({
        id: randomUUID(),
        clientId: clientB,
        siteId: siteA,
        templateId: template,
        createdBy: staff.id,
      }),
    ),
  ).rejects.toThrow();
  await asStaff((tx) => tx.insert(formAnswer).values(answer({ supersededAt: new Date() })));
});
