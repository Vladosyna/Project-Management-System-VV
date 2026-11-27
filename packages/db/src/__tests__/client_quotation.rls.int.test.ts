// client_quote_config, sensor_price, client_quotation, client_quotation_site — RLS and integrity; D-40. Internal only;
// one active config per client × country; VAT rate only with DDP local VAT; an hours override needs a reason; "sent"
// is recorded with who and when.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  clientQuotation,
  clientQuotationSite,
  clientQuoteConfig,
  createDatabase,
  inActorTransaction,
  migrateUp,
  sensorPrice,
  site,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const siteA = randomUUID();
const configA = randomUUID();
const quoteA = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const config = (more: Partial<typeof clientQuoteConfig.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  countryCode: 'ES',
  currency: 'EUR',
  hourlyRate: '190.00',
  taxMode: 'ddp_local_vat' as const,
  vatRate: '21.00',
  seller: { name: 'Vionvision Entity A' },
  buyer: { name: 'Client A' },
  bank: { beneficiary: 'Vionvision Entity A' },
  terms: ['Devices carry a 3-year warranty.'],
  numberPrefix: 'QA',
  createdBy: staff.id,
  ...more,
});
const quotation = (more: Partial<typeof clientQuotation.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  configId: configA,
  number: `QA-${randomUUID().slice(0, 8)}`,
  title: 'Rollout batch 1',
  issueDate: '2026-11-27',
  lines: [{ kind: 'sensor', label: 'Sensor model A', unitPrice: '1000.00', units: 2, subtotal: '2000.00' }],
  standardHours: '6.0',
  quotedHours: '6.0',
  currency: 'EUR',
  subtotal: '3140.00',
  taxMode: 'ddp_local_vat' as const,
  vatAmount: '0.00',
  total: '3140.00',
  createdBy: staff.id,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const seen = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => [
    (await tx.select().from(clientQuoteConfig)).length,
    (await tx.select().from(sensorPrice)).length,
    (await tx.select().from(clientQuotation)).length,
    (await tx.select().from(clientQuotationSite)).length,
  ]);

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
    await tx.insert(clientQuoteConfig).values(config({ id: configA }));
    await tx.insert(sensorPrice).values({
      id: randomUUID(),
      clientId: clientA,
      model: 'Sensor model A',
      unitPrice: '1000.00',
      currency: 'EUR',
      createdBy: staff.id,
    });
    await tx.insert(clientQuotation).values(quotation({ id: quoteA }));
    await tx
      .insert(clientQuotationSite)
      .values({ quotationId: quoteA, clientId: clientA, siteId: siteA, sensorCount: 2, scope: 'full' });
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see quotation data; clients and partners never do', async () => {
  expect([await seen(staff), await seen(userOfA), await seen(partnerOfA)]).toEqual([
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) => tx.insert(clientQuotation).values(quotation())),
  ).rejects.toThrow();
});

it('one active config per client and country; VAT rate only with DDP local VAT', async () => {
  await expect(asStaff((tx) => tx.insert(clientQuoteConfig).values(config()))).rejects.toThrow();
  const rc = { countryCode: 'PL', taxMode: 'reverse_charge' as const };
  await expect(asStaff((tx) => tx.insert(clientQuoteConfig).values(config(rc)))).rejects.toThrow();
  await asStaff((tx) => tx.insert(clientQuoteConfig).values(config({ ...rc, vatRate: null })));
});

it('changed hours need a reason; sent needs who and when', async () => {
  await expect(
    asStaff((tx) => tx.insert(clientQuotation).values(quotation({ quotedHours: '5.0' }))),
  ).rejects.toThrow();
  await asStaff((tx) =>
    tx
      .insert(clientQuotation)
      .values(quotation({ quotedHours: '5.0', hoursReason: 'Agreed with the client' })),
  );
  await expect(
    asStaff((tx) => tx.insert(clientQuotation).values(quotation({ status: 'sent' }))),
  ).rejects.toThrow();
});
