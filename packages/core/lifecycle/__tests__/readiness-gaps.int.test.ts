// lifecycle.readinessGaps.read — R9 (domain/rules.md, P0; SOP-DEL-04 steps 6–7): every active project, flagged when
// its installation is within the readiness window (template days, else the default) and readiness is not confirmed.
// Installed projects and projects without a planned date are never flagged; archived projects are not listed.
// R32 (D-47): readiness not confirmed 20 working days before the planned installation (exactly D−20 → flagged).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  aStaffActor,
  createFakeClock,
  createTestDatabase,
  runAsOwner,
  type TestDatabase,
} from '@ocs/testing';
import { addWorkingDays } from '../../calendar/index.ts';
import { Forbidden, openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { readinessGaps } from '../queries/readiness-gaps.ts';

const pm = aStaffActor({ roles: ['pm'] });
const system = systemActor('readiness-alerts');
const clock = createFakeClock(new Date('2026-12-07T09:00:00Z')); // a Monday
let testDb: TestDatabase;
let t: TestKernel;
const ids: Record<string, string> = {};

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url, { clock: clock.now });
  t.grant(pm, createClient.permission, createSite.permission);
  t.grant(system, readinessGaps.permission);
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  // Anonymised client template with a D−2 readiness check.
  await runAsOwner(
    testDb.url,
    `INSERT INTO gate_template (id, client_id, name, gates) VALUES ($1, $2, 'Client A gates', $3)`,
    [
      randomUUID(),
      a.id,
      JSON.stringify([{ key: 'g3', name: 'Deployment ready', order: 1, readinessDays: 2 }]),
    ],
  );
  const place = { clientId: a.id, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  // Working days after Mon 7 Dec (GB): Wed 9 Dec = 2 (the boundary), Thu 10 Dec = 3.
  const sites: [string, string | null, string[]][] = [
    ['atD2', '2026-12-09', []],
    ['atD3', '2026-12-10', []],
    ['confirmed', '2026-12-09', ['readiness_confirmed']],
    ['installed', '2026-12-09', ['installed']],
    ['unplanned', null, []],
    ['archived', '2026-12-09', []],
    ['atD20', addWorkingDays('2026-12-07', 20, 'GB'), []],
    ['atD21', addWorkingDays('2026-12-07', 21, 'GB'), []],
    ['confirmedD20', addWorkingDays('2026-12-07', 20, 'GB'), ['readiness_confirmed']],
  ];
  for (const [name, planned, steps] of sites) {
    const { id } = await t.kernel.execute(createSite, pm, { ...place, name }, 'test');
    ids[name] = id;
    await runAsOwner(testDb.url, `UPDATE site SET planned_installation_date = $1 WHERE id = $2`, [
      planned,
      id,
    ]);
    for (const step of steps)
      await runAsOwner(
        testDb.url,
        `INSERT INTO site_step (id, client_id, site_id, step, done_on, actor_id) VALUES ($1, $2, $3, $4, '2026-12-04', $5)`,
        [randomUUID(), a.id, id, step, pm.id],
      );
  }
  await runAsOwner(testDb.url, `UPDATE site SET archived_at = now() WHERE id = $1`, [ids.archived]);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('lifecycle.readinessGaps.read (R9)', () => {
  it('flags only the project at D−2 without readiness confirmed; lists every active project', async () => {
    const rows = await t.kernel.read(readinessGaps, system, {});
    const byId = new Map(rows.map((r) => [r.siteId, r]));
    expect(byId.get(ids.atD2 ?? '')).toMatchObject({
      r9: true,
      plannedInstallationDate: '2026-12-09',
      workingDaysToInstallation: 2,
    });
    for (const name of ['atD3', 'confirmed', 'installed', 'unplanned'])
      expect(byId.get(ids[name] ?? '')?.r9, name).toBe(false);
    expect(byId.has(ids.archived ?? '')).toBe(false);
  });

  it('R32: flags readiness not confirmed from D−20 (exactly D−20 yes, D−21 no), never once confirmed or installed', async () => {
    const rows = await t.kernel.read(readinessGaps, system, {});
    const r32 = Object.fromEntries(
      ['atD20', 'atD21', 'confirmedD20', 'atD2', 'confirmed', 'installed', 'unplanned'].map((n) => [
        n,
        rows.find((r) => r.siteId === ids[n])?.r32,
      ]),
    );
    expect(r32).toEqual({
      atD20: true,
      atD21: false,
      confirmedD20: false,
      atD2: true,
      confirmed: false,
      installed: false,
      unplanned: false,
    });
  });

  it('only the system actor runs it', async () => {
    await expect(t.kernel.read(readinessGaps, pm, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
