// commercial records (E13, D-34 N2): money in original currency and EUR; a person's entry is confirmed at once, an
// AI agent's stays a proposal until a person confirms; staff roles only.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  Conflict,
  Forbidden,
  openTestKernel,
  ValidationFailed,
  type TestKernel,
} from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { confirmRecord } from '../commands/confirm-record.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { siteCommercial } from '../queries/site-commercial.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agentOfPm = { ...pm, via: 'mcp:test-agent' };
const rnd = aStaffActor({ roles: ['rnd'] });
let testDb: TestDatabase;
let t: TestKernel;
let siteA: string;
const po = {
  kind: 'client_po',
  reference: 'PO-0001',
  recordDate: '2026-11-20',
  money: { amount: '1200.00', currency: 'GBP', fxRate: '1.160000', fxDate: '2026-11-20', fxSource: 'manual' },
};
const propose = (input: Record<string, unknown>, actor = pm) =>
  t.kernel.execute(proposeRecord, actor, { siteId: siteA, ...input }, 'test');

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(
    pm,
    createClient.permission,
    createSite.permission,
    proposeRecord.permission,
    confirmRecord.permission,
    siteCommercial.permission,
  );
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { countryCode: 'GB', cityCode: 'LON', cityName: 'London', name: 'Mall A', standard: 'S' };
  ({ id: siteA } = await t.kernel.execute(createSite, pm, { clientId: a.id, ...place }, 'test'));
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial records', () => {
  it('only staff roles that run the money may write', async () => {
    await expect(propose(po, rnd)).rejects.toBeInstanceOf(Forbidden);
  });

  it('a PM enters a PO: kept in GBP and EUR with the rate, confirmed at once, audited', async () => {
    expect(await propose(po)).toMatchObject({ confirmed: true });
    const [row] = await t.kernel.read(siteCommercial, pm, { siteId: siteA });
    expect(row).toMatchObject({
      kind: 'client_po',
      reference: 'PO-0001',
      money: { amount: '1200.00', currency: 'GBP', eur: '1392.00', fxRate: '1.160000' },
      proposedVia: 'web',
      confirmed: true,
    });
    expect(await countRows(testDb.url, 'audit_event WHERE command = $1', [proposeRecord.name])).toBe(1);
  });

  it('EUR needs no rate; any other currency does', async () => {
    const eur = { ...po, reference: 'PO-0002', money: { amount: '50.00', currency: 'EUR' } };
    await propose(eur);
    const noRate = { amount: '10.00', currency: 'GBP', fxDate: '2026-11-20', fxSource: 'manual' };
    await expect(propose({ ...po, reference: 'PO-0003', money: noRate })).rejects.toBeInstanceOf(
      ValidationFailed,
    );
  });

  it('each kind gets only what it can carry', async () => {
    const dpiaWithMoney = { kind: 'dpia', status: 'approved', recordDate: '2026-11-21', money: po.money };
    await expect(propose(dpiaWithMoney)).rejects.toBeInstanceOf(ValidationFailed);
    const paidPo = { ...po, reference: 'PO-0009', status: 'paid' };
    await expect(propose(paidPo)).rejects.toBeInstanceOf(ValidationFailed);
    const invoiceWithoutNumber = { kind: 'client_invoice', status: 'issued', recordDate: '2026-11-21' };
    await expect(propose(invoiceWithoutNumber)).rejects.toBeInstanceOf(ValidationFailed);
  });

  it('an AI agent only proposes; it may not confirm; a person confirms once', async () => {
    const { id } = await propose({ kind: 'dpia', status: 'approved', recordDate: '2026-11-21' }, agentOfPm);
    await expect(t.kernel.execute(confirmRecord, agentOfPm, { recordId: id }, 'test')).rejects.toBeInstanceOf(
      Forbidden,
    );
    await t.kernel.execute(confirmRecord, pm, { recordId: id }, 'test');
    await expect(t.kernel.execute(confirmRecord, pm, { recordId: id }, 'test')).rejects.toBeInstanceOf(
      Conflict,
    );
  });
});
