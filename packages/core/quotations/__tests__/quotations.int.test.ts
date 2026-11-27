// Client quotations (D-40, E15) — the existing commercial quotation reproduced with anonymised data: 7 stores, 33
// sensors at net 1050 (1270.50 with 21 % VAT), full installation; standard 2N + 2 per store = 80 h, quoted 78 h with a reason at net 160/h (193.60 with VAT);
// DDP with local VAT paid by Vionvision → no VAT on the document; total 57 027.30. A draft only.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { Forbidden, NotFound, openTestKernel, RuleViolation, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { draftQuotation } from '../commands/draft-quotation.ts';
import { saveConfig } from '../commands/save-config.ts';
import { savePrice } from '../commands/save-price.ts';

const director = aStaffActor({ roles: ['director'] });
const pm = aStaffActor({ roles: ['pm'] });
let testDb: TestDatabase;
let t: TestKernel;
let clientId: string;
const stores: { siteId: string; scope: 'full'; devices: { model: string; count: number }[] }[] = [];
const draft = (more: Record<string, unknown> = {}) =>
  t.kernel.execute(
    draftQuotation,
    pm,
    {
      clientId,
      countryCode: 'ES',
      title: 'Rollout batch 1',
      issueDate: '2026-10-26',
      model: 'Sensor model A',
      stores,
      ...more,
    },
    'test',
  );

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(
    director,
    createClient.permission,
    createSite.permission,
    saveConfig.permission,
    savePrice.permission,
  );
  t.grant(pm, draftQuotation.permission);
  ({ id: clientId } = await t.kernel.execute(
    createClient,
    director,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
  for (const [n, sensors] of [5, 5, 5, 5, 5, 4, 4].entries()) {
    const place = {
      clientId,
      countryCode: 'ES',
      cityCode: 'MAD',
      cityName: 'Madrid',
      name: `Store ${String(n)}`,
      standard: 'S',
    };
    const { id } = await t.kernel.execute(createSite, director, place, 'test');
    stores.push({ siteId: id, scope: 'full', devices: [{ model: 'G6', count: sensors }] });
  }
  await t.kernel.execute(
    saveConfig,
    director,
    {
      clientId,
      countryCode: 'ES',
      currency: 'EUR',
      hourlyRate: '160.00',
      taxMode: 'ddp_local_vat',
      vatRate: '21',
      seller: { name: 'Vionvision Entity A' },
      buyer: { name: 'Client A' },
      bank: { beneficiary: 'Vionvision Entity A' },
      terms: ['All devices carry a 3-year warranty.'],
      numberPrefix: 'QA',
    },
    'test',
  );
  await t.kernel.execute(
    savePrice,
    director,
    { clientId, model: 'G6', unitPrice: '1050.00', currency: 'EUR' },
    'test',
  );
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('client quotations (D-40)', () => {
  it('only a director sets settings and prices', async () => {
    const price = { clientId, model: 'G6', unitPrice: '1', currency: 'EUR' };
    await expect(t.kernel.execute(savePrice, pm, price, 'test')).rejects.toBeInstanceOf(Forbidden);
  });

  it('an override of the time standard needs a reason', async () => {
    await expect(draft({ quotedHours: 78 })).rejects.toBeInstanceOf(RuleViolation);
  });

  it('reproduces the existing quotation to the cent', async () => {
    const q = await draft({ quotedHours: 78, hoursReason: 'Agreed with the client' });
    expect(q).toMatchObject({
      number: 'QA2026102601',
      standardHours: 80,
      quotedHours: 78,
      subtotal: '57027.30',
      total: '57027.30',
      taxMode: 'ddp_local_vat',
    });
    expect(q.lines.map((l) => [l.kind, l.unitPrice, l.units, l.subtotal])).toEqual([
      ['device', '1270.50', 33, '41926.50'],
      ['installation', '193.60', 78, '15100.80'],
    ]);
  });

  it('no settings for the country → refused', async () => {
    await expect(draft({ countryCode: 'PT' })).rejects.toBeInstanceOf(NotFound);
  });

  it('several models: one line per model; CBox priced but not in the hours (D-42)', async () => {
    await t.kernel.execute(
      savePrice,
      director,
      { clientId, model: 'CBox', unitPrice: '500', currency: 'EUR' },
      'test',
    );
    const [first] = stores;
    const q = await draft({
      stores: [
        {
          ...first,
          devices: [
            { model: 'G6', count: 4 },
            { model: 'CBox', count: 1 },
          ],
        },
      ],
    });
    expect(q.standardHours).toBe(10);
    expect(q.lines.map((l) => [l.label, l.unitPrice, l.units])).toEqual([
      ['G6', '1270.50', 4],
      ['CBox', '605.00', 1],
      ['Full on-site installation support and cabling 10 hours', '193.60', 10],
    ]);
  });

  it("a store's devices default to those registered on the project (D-42)", async () => {
    const [first] = stores;
    for (const sn of ['SN-Q1', 'SN-Q2', 'SN-Q3'])
      await runAsOwner(
        testDb.url,
        `INSERT INTO device (id, client_id, site_id, sn, model) VALUES (gen_random_uuid(), $1, $2, $3, 'G6')`,
        [clientId, first?.siteId, sn],
      );
    const q = await draft({ stores: [{ siteId: first?.siteId, scope: 'partial' }] });
    expect([q.standardHours, q.lines[0]?.units]).toEqual([5, 3]);
  });

  it('manual lines for a client without the formula: prices, quantities, hours as entered (D-42)', async () => {
    const manualLines = [
      { kind: 'device', label: 'Sensor', unitPrice: '1000', units: 2 },
      { kind: 'installation', label: 'Installation', unitPrice: '100', units: 7 },
    ];
    const q = await draft({ stores: [], manualLines });
    expect([q.standardHours, q.quotedHours, q.total]).toEqual([7, 7, '3267.00']);
  });
});
