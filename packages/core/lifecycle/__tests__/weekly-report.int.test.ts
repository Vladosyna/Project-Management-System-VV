// lifecycle.weeklyReport.read — E11 AC1 (D-44 (5)): the Friday report per client — the client's projects that changed in
// one week (Monday 00:00 to Sunday 24:00 UTC): steps recorded and planned installation dates set or moved. Projects
// without a change and other clients' projects are left out. Anonymised data only.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createFakeClock, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { planInstallation } from '../commands/plan-installation.ts';
import { recordStep } from '../commands/record-step.ts';
import { weeklyReport } from '../queries/weekly-report.ts';

const pm = aStaffActor({ roles: ['pm'] });
const other = aStaffActor();
const clock = createFakeClock('2026-11-22T10:00:00Z'); // Sunday of the week before
let testDb: TestDatabase;
let t: TestKernel;
let clientA: string;
const ids: Record<string, string> = {};

const step = (siteId: string, s: string) =>
  t.kernel.execute(recordStep, pm, { siteId, step: s, doneOn: '2026-11-20' }, 'test');

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url, { clock: clock.now });
  t.grant(
    pm,
    createClient.permission,
    createSite.permission,
    recordStep.permission,
    planInstallation.permission,
  );
  t.grant(pm, weeklyReport.permission);
  ({ id: clientA } = await t.kernel.execute(
    createClient,
    pm,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
  const b = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTB', name: 'Client B' }, 'test');
  const place = { countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  for (const [name, clientId] of [
    ['moved', clientA],
    ['started', clientA],
    ['quiet', clientA],
    ['otherClient', b.id],
  ] as const)
    ids[name] = (await t.kernel.execute(createSite, pm, { ...place, clientId, name }, 'test')).id;
  await step(ids.moved ?? '', 'card_received'); // last week: not in the report
  await step(ids.quiet ?? '', 'card_received');
  clock.set('2026-12-02T09:00:00Z'); // Wednesday of the reported week (Mon 30 Nov – Sun 6 Dec)
  await step(ids.moved ?? '', 'card_complete');
  await t.kernel.execute(planInstallation, pm, { siteId: ids.moved, date: '2026-12-15' }, 'test');
  await t.kernel.execute(planInstallation, pm, { siteId: ids.moved, date: '2026-12-18' }, 'test');
  await step(ids.started ?? '', 'card_received');
  await step(ids.otherClient ?? '', 'card_received');
  clock.set('2026-12-07T00:00:00Z'); // next Monday 00:00: the following week
  await step(ids.quiet ?? '', 'card_complete');
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('lifecycle.weeklyReport.read — E11 AC1', () => {
  it("lists the client's projects that changed in the week: steps recorded, planned dates set or moved", async () => {
    const report = await t.kernel.read(weeklyReport, pm, { clientId: clientA, weekStart: '2026-11-30' });
    expect(report.weekEnd).toBe('2026-12-06');
    expect(report.projects.map((p) => p.siteId)).toEqual([ids.moved, ids.started]);
    expect(report.projects[0]).toMatchObject({
      steps: [{ step: 'card_complete', doneOn: '2026-11-20', recordedOn: '2026-12-02' }],
      dates: [
        { from: null, to: '2026-12-15', changedOn: '2026-12-02' },
        { from: '2026-12-15', to: '2026-12-18', changedOn: '2026-12-02' },
      ],
    });
    expect(report.projects[1]).toMatchObject({ steps: [{ step: 'card_received' }], dates: [] });
  });

  it('a week must start on a Monday', async () => {
    await expect(
      t.kernel.read(weeklyReport, pm, { clientId: clientA, weekStart: '2026-12-01' }),
    ).rejects.toThrow();
  });

  it('refuses an actor without the permission', async () => {
    await expect(
      t.kernel.read(weeklyReport, other, { clientId: clientA, weekStart: '2026-11-30' }),
    ).rejects.toBeInstanceOf(Forbidden);
  });
});
