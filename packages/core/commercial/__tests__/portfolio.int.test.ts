// commercial.portfolio.read — one row per site; only confirmed records count; proposals are counted apart.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { portfolio } from '../queries/portfolio.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const rnd = aStaffActor({ roles: ['rnd'] });
let testDb: TestDatabase;
let t: TestKernel;
let siteA: string;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, proposeRecord.permission, portfolio.permission);
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { countryCode: 'GB', cityCode: 'LON', cityName: 'London', name: 'Mall A', standard: 'S' };
  ({ id: siteA } = await t.kernel.execute(createSite, pm, { clientId: a.id, ...place }, 'test'));
  await t.kernel.execute(createSite, pm, { clientId: a.id, ...place, name: 'Mall B' }, 'test');
  const gbp = (amount: string) => ({
    amount,
    currency: 'GBP',
    fxRate: '1.16',
    fxDate: '2026-11-20',
    fxSource: 'manual',
  });
  const add = (input: Record<string, unknown>, actor = pm) =>
    t.kernel.execute(proposeRecord, actor, { siteId: siteA, recordDate: '2026-11-20', ...input }, 'test');
  await add({ kind: 'client_po', reference: 'PO-1', money: gbp('1000.00') });
  await add({ kind: 'client_po', reference: 'PO-2', money: { amount: '100.00', currency: 'EUR' } });
  await add({ kind: 'client_invoice', reference: 'INV-1', status: 'paid', money: gbp('500.00') });
  await add({ kind: 'dpia', status: 'approved' });
  await add({ kind: 'client_po', reference: 'PO-AI', money: gbp('9999.00') }, agent);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.portfolio.read', () => {
  it('sums confirmed records in EUR per site; AI proposals are counted, not summed', async () => {
    const rows = await t.kernel.read(portfolio, pm, {});
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.siteId === siteA)).toMatchObject({
      poCount: 2,
      poEur: '1260.00',
      invoicedEur: '580.00',
      paidEur: '580.00',
      dpia: 'approved',
      priceEur: null,
      proposals: 1,
    });
    expect(rows.find((r) => r.siteId !== siteA)).toMatchObject({ poCount: 0, poEur: '0.00', proposals: 0 });
  });

  it('only roles that work with the money may read it', async () => {
    await expect(t.kernel.read(portfolio, rnd, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
