// commercial.weeklyChanges.read — E11 AC1 (D-44 (5)): the Friday report per client, commercial part — the client's
// commercial records added, confirmed or archived in one week (Monday 00:00 to next Monday 00:00 UTC), oldest first.
// A record a person enters is confirmed at once and shows once, as added. Anonymised data only.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createFakeClock, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { archiveRecord } from '../commands/archive-record.ts';
import { confirmRecord } from '../commands/confirm-record.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { weeklyChanges } from '../queries/weekly-changes.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const other = aStaffActor();
const clock = createFakeClock('2026-11-25T10:00:00Z'); // Wednesday of the week before
let testDb: TestDatabase;
let t: TestKernel;
let clientA: string;
let siteA: string;
let siteB: string;

const record = (siteId: string, kind: string, reference: string, status: string, actor = pm) =>
  t.kernel.execute(
    proposeRecord,
    actor,
    {
      siteId,
      kind,
      reference,
      status,
      recordDate: '2026-11-20',
      money: { amount: '1000.00', currency: 'EUR' },
    },
    'test',
  );

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url, { clock: clock.now });
  t.grant(pm, createClient.permission, createSite.permission, proposeRecord.permission);
  t.grant(pm, confirmRecord.permission, archiveRecord.permission, weeklyChanges.permission);
  ({ id: clientA } = await t.kernel.execute(
    createClient,
    pm,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
  const b = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTB', name: 'Client B' }, 'test');
  const place = { countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S', name: 'Store' };
  ({ id: siteA } = await t.kernel.execute(createSite, pm, { ...place, clientId: clientA }, 'test'));
  ({ id: siteB } = await t.kernel.execute(createSite, pm, { ...place, clientId: b.id }, 'test'));
  const old = await record(siteA, 'client_po', 'PO-OLD', 'received');
  clock.set('2026-12-01T09:00:00Z'); // Tuesday of the reported week (Mon 30 Nov – Sun 6 Dec)
  await record(siteA, 'client_po', 'PO-1', 'received');
  const inv = await record(siteA, 'client_invoice', 'INV-1', 'issued', agent);
  await record(siteB, 'client_po', 'PO-B', 'received');
  await t.kernel.execute(archiveRecord, pm, { recordId: old.id, reason: 'Replaced by PO-1' }, 'test');
  clock.set('2026-12-02T09:00:00Z');
  await t.kernel.execute(confirmRecord, pm, { recordId: inv.id }, 'test');
  clock.set('2026-12-07T00:00:00Z'); // next Monday 00:00: the following week
  await record(siteA, 'client_po', 'PO-NEXT', 'received');
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.weeklyChanges.read — E11 AC1', () => {
  it("lists the client's records added, confirmed or archived in the week, oldest first", async () => {
    const { changes } = await t.kernel.read(weeklyChanges, pm, {
      clientId: clientA,
      weekStart: '2026-11-30',
    });
    expect(changes.map((c) => [c.change, c.reference, c.on])).toEqual([
      ['added', 'PO-1', '2026-12-01'],
      ['added', 'INV-1', '2026-12-01'],
      ['archived', 'PO-OLD', '2026-12-01'],
      ['confirmed', 'INV-1', '2026-12-02'],
    ]);
    expect(changes[0]).toMatchObject({
      siteId: siteA,
      kind: 'client_po',
      part: 'all',
      eur: '1000.00',
      confirmed: true,
    });
    expect(changes[1]).toMatchObject({ kind: 'client_invoice', confirmed: false });
  });

  it('a week must start on a Monday', async () => {
    await expect(
      t.kernel.read(weeklyChanges, pm, { clientId: clientA, weekStart: '2026-12-02' }),
    ).rejects.toThrow();
  });

  it('refuses an actor without the permission', async () => {
    await expect(
      t.kernel.read(weeklyChanges, other, { clientId: clientA, weekStart: '2026-11-30' }),
    ).rejects.toBeInstanceOf(Forbidden);
  });
});
