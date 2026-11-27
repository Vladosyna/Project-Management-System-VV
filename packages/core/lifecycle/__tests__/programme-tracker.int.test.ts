// lifecycle.programmeTracker.read — E11 AC3: the programme tracker that replaces the hand-kept Excel tracker —
// stores, dates, status and gates, one row per active project, filtered by client, programme or country. Same
// stage / gate / readiness reading as the Lifecycle tab (E3). Anonymised data only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  aStaffActor,
  createFakeClock,
  createTestDatabase,
  runAsOwner,
  type TestDatabase,
} from '@ocs/testing';
import { Forbidden, openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { createClient, createProgramme, createSite } from '../../org/index.ts';
import { programmeTracker } from '../queries/programme-tracker.ts';
import { siteLifecycle } from '../queries/site-lifecycle.ts';

const pm = aStaffActor({ roles: ['pm'] });
const other = aStaffActor({ roles: ['pm'] });
const clock = createFakeClock(new Date('2026-12-07T09:00:00Z')); // a Monday
let testDb: TestDatabase;
let t: TestKernel;
let clientA: string;
let programme: string;
const ids: Record<string, string> = {};

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url, { clock: clock.now });
  t.grant(pm, createClient.permission, createProgramme.permission, createSite.permission);
  t.grant(pm, programmeTracker.permission, siteLifecycle.permission);
  ({ id: clientA } = await t.kernel.execute(
    createClient,
    pm,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
  const { id: clientB } = await t.kernel.execute(
    createClient,
    pm,
    { shortCode: 'CLIENTB', name: 'Client B' },
    'test',
  );
  ({ id: programme } = await t.kernel.execute(
    createProgramme,
    pm,
    { clientId: clientA, name: 'Programme 1' },
    'test',
  ));
  await runAsOwner(
    testDb.url,
    `INSERT INTO gate_template (id, client_id, name, gates) VALUES ($1, $2, 'Client A gates', $3)`,
    [
      randomUUID(),
      clientA,
      JSON.stringify([
        { key: 'g1', name: 'Gate 1', order: 1 },
        { key: 'g2', name: 'Gate 2', order: 2 },
        { key: 'g3', name: 'Gate 3', order: 3, readinessDays: 2 },
      ]),
    ],
  );
  const gb = { countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  const es = { countryCode: 'ES', cityCode: 'MAD', cityName: 'Madrid', standard: 'L' };
  const add = async (name: string, input: Record<string, unknown>) => {
    ({ id: ids[name] } = await t.kernel.execute(createSite, pm, { ...input, name }, 'test'));
    return ids[name] ?? '';
  };
  const a1 = await add('Store 001', { clientId: clientA, programmeId: programme, ...gb });
  await add('Store 002', { clientId: clientA, ...es });
  const archived = await add('Store 003', { clientId: clientA, ...gb });
  await add('Store 101', { clientId: clientB, ...gb });
  await runAsOwner(testDb.url, `UPDATE site SET planned_installation_date = '2026-12-09' WHERE id = $1`, [
    a1,
  ]);
  for (const [step, on] of [
    ['card_received', '2026-11-20'],
    ['card_complete', '2026-11-25'],
    ['g1', '2026-11-26'],
  ])
    await runAsOwner(
      testDb.url,
      `INSERT INTO site_step (id, client_id, site_id, step, done_on, actor_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), clientA, a1, step, on, pm.id],
    );
  await runAsOwner(testDb.url, `UPDATE site SET archived_at = now() WHERE id = $1`, [archived]);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

const read = (input: Record<string, unknown> = {}) => t.kernel.read(programmeTracker, pm, input);

describe('lifecycle.programmeTracker.read (E11 AC3)', () => {
  it('one row per active project, by Project ID: store, dates, status and gates', async () => {
    const rows = await read();
    // CLIENTA-ES-MAD-… sorts before CLIENTA-GB-LON-…; the archived Store 003 is not listed.
    expect(rows.map((r) => r.name)).toEqual(['Store 002', 'Store 001', 'Store 101']);
    expect(rows[1]).toMatchObject({
      siteId: ids['Store 001'],
      clientId: clientA,
      programmeId: programme,
      countryCode: 'GB',
      cityName: 'London',
      standard: 'S',
      stage: 'card_complete',
      plannedInstallationDate: '2026-12-09',
      workingDaysToInstallation: 2,
      readinessAtRisk: true,
      gates: [
        { key: 'g1', name: 'Gate 1', status: 'passed', doneOn: '2026-11-26' },
        { key: 'g2', name: 'Gate 2', status: 'current', doneOn: null },
        { key: 'g3', name: 'Gate 3', status: 'not_started', doneOn: null },
      ],
    });
    expect(rows[1]?.projectId).toMatch(/^CLIENTA-GB-LON-\d{3}$/);
    expect(rows[0]).toMatchObject({ stage: null, plannedInstallationDate: null, readinessAtRisk: false });
  });

  it('reads each project the same way as the Lifecycle tab', async () => {
    const [row] = await read({ programmeId: programme });
    const tab = await t.kernel.read(siteLifecycle, pm, { siteId: ids['Store 001'] ?? '' });
    expect(row).toMatchObject({
      stage: tab.stage,
      gates: tab.gates,
      workingDaysToInstallation: tab.workingDaysToInstallation,
      readinessAtRisk: tab.readinessAtRisk,
    });
  });

  it('filters by client, programme and country', async () => {
    const names = async (input: Record<string, unknown>) => (await read(input)).map((r) => r.name);
    expect(await names({ clientId: clientA })).toEqual(['Store 002', 'Store 001']);
    expect(await names({ programmeId: programme })).toEqual(['Store 001']);
    expect(await names({ countryCode: 'GB' })).toEqual(['Store 001', 'Store 101']);
    expect(await names({ clientId: clientA, countryCode: 'ES' })).toEqual(['Store 002']);
  });

  it('refuses an actor without the permission', async () => {
    await expect(t.kernel.read(programmeTracker, other, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
