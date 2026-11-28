// installers.designChecks.read — R12 (domain/rules.md §12, P0): an open installer job whose sensor count differs from
// the store's active proposal (D-43), sensors counted as in the time standard (D-42: CBox not counted). Anonymised data.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { createJob } from '../commands/create-job.ts';
import { designChecks } from '../queries/design-checks.ts';

const pm = aStaffActor({ roles: ['pm'] });
const system = systemActor('installer-alerts');
const NAMES = ['matches', 'differs', 'noDesign', 'olderDesignArchived'] as const;
const ids = {} as Record<(typeof NAMES)[number], string>;
let testDb: TestDatabase;
let t: TestKernel;
let clientId: string;

/** 10 G6 + 2 G6S = 12 sensors, plus `extra` G6 and one CBox (not counted). */
const design = (siteId: string, extra: number, version = 1, archived = false) =>
  runAsOwner(
    testDb.url,
    `INSERT INTO site_proposal (id, client_id, site_id, version, items, proposal_ref, created_by, archived_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'PROP-1', $6, ${archived ? 'now()' : 'NULL'})`,
    [
      randomUUID(),
      clientId,
      siteId,
      version,
      JSON.stringify([
        { model: 'G6', count: 10 + extra },
        { model: 'G6S', count: 2 },
        { model: 'CBox', count: 1 },
      ]),
      pm.id,
    ],
  );

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, createJob.permission);
  t.grant(system, designChecks.permission);
  ({ id: clientId } = await t.kernel.execute(
    createClient,
    pm,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
  const place = { clientId, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  for (const name of NAMES) {
    ({ id: ids[name] } = await t.kernel.execute(createSite, pm, { ...place, name }, 'test'));
    const job = { siteId: ids[name], scope: 'full', sensorCount: 12, sowVersion: 'v1' };
    await t.kernel.execute(createJob, pm, job, 'test');
  }
  await design(ids.matches, 0);
  await design(ids.differs, 1);
  await design(ids.olderDesignArchived, 1, 1, true);
  await design(ids.olderDesignArchived, 0, 2);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('installers.designChecks.read — R12', () => {
  it('flags an open job whose sensors differ from the active design (CBox not counted)', async () => {
    const rows = await t.kernel.read(designChecks, system, {});
    const r12 = Object.fromEntries(NAMES.map((n) => [n, rows.find((r) => r.siteId === ids[n])?.r12]));
    expect(r12).toEqual({ matches: false, differs: true, noDesign: false, olderDesignArchived: false });
    expect(rows.find((r) => r.siteId === ids.differs)).toMatchObject({ jobSensors: 12, designSensors: 13 });
  });

  it('is for the alert run only', async () => {
    await expect(t.kernel.read(designChecks, pm, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
