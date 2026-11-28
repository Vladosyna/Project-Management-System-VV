// installers.quoteChecks.read — R29 (domain/rules.md §29, D-44): per sensor > 20 % above the average of the other
// confirmed quotes of the same country and scope, at least 3 to compare. Anonymised data only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { createJob } from '../commands/create-job.ts';
import { proposeQuote } from '../commands/propose-quote.ts';
import { recordApproval } from '../commands/record-approval.ts';
import { quoteChecks } from '../queries/quote-checks.ts';
import { siteJobs } from '../queries/site-jobs.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const system = systemActor('installer-alerts');
const partner = randomUUID();
const NAMES = ['p1', 'p2', 'p3', 'above', 'approved', 'agentOnly', 'es1', 'es2', 'otherScope'] as const;
const ids = {} as Record<(typeof NAMES)[number], string>;
let testDb: TestDatabase;
let t: TestKernel;

/** A job with 4 sensors and one quote of 4 per-unit lines at `perSensor` EUR. */
async function quote(siteId: string, perSensor: number, scope = 'full', actor = pm) {
  const job = await t.kernel.execute(
    createJob,
    pm,
    { siteId, scope, sensorCount: 4, sowVersion: 'v1' },
    'test',
  );
  const { id } = await t.kernel.execute(
    proposeQuote,
    actor,
    {
      jobId: job.id,
      partnerId: partner,
      lines: [{ kind: 'unit', description: 'Sensor', quantity: 4, unitPrice: String(perSensor) }],
      currency: 'EUR',
      fxDate: '2026-11-26',
      source: { kind: 'mail' },
    },
    'test',
  );
  return { jobId: job.id, quoteId: id };
}

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, createJob.permission, proposeQuote.permission);
  t.grant(pm, recordApproval.permission, siteJobs.permission);
  t.grant(system, quoteChecks.permission);
  await runAsOwner(
    testDb.url,
    `INSERT INTO partner (id, real_name, country_code) VALUES ($1, 'Partner', 'GB')`,
    [partner],
  );
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const gb = { clientId: a.id, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  const es = { clientId: a.id, countryCode: 'ES', cityCode: 'MAD', cityName: 'Madrid', standard: 'S' };
  for (const name of NAMES) {
    const place = name.startsWith('es') ? es : gb;
    ({ id: ids[name] } = await t.kernel.execute(createSite, pm, { ...place, name }, 'test'));
  }
  // GB full: 100, 100, 100 and an approved 150 → the average for "above" is 112.5; 150 is +33 %.
  for (const p of ['p1', 'p2', 'p3'] as const) await quote(ids[p], 100);
  await quote(ids.above, 150);
  const approved = await quote(ids.approved, 150);
  await t.kernel.execute(
    recordApproval,
    pm,
    { ...approved, approvalRef: 'OA-1', approvedOn: '2026-11-26', singleQuoteReason: 'Urgent' },
    'test',
  );
  await quote(ids.agentOnly, 900, 'full', agent); // not confirmed: neither checked nor in the average
  await quote(ids.es1, 100); // ES full: a pool of 1 each — too few to compare
  await quote(ids.es2, 300);
  await quote(ids.otherScope, 300, 'partial'); // GB partial: compared only with partial quotes
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('installers.quoteChecks.read — R29 (D-44)', () => {
  it('flags a quote more than 20 % above the average of the same country and scope, per sensor', async () => {
    const rows = await t.kernel.read(quoteChecks, system, {});
    const r29 = Object.fromEntries(NAMES.map((n) => [n, rows.find((r) => r.siteId === ids[n])?.r29]));
    expect(r29).toEqual({
      p1: false,
      p2: false,
      p3: false,
      above: true,
      approved: false,
      agentOnly: false,
      es1: false,
      es2: false,
      otherScope: false,
    });
    expect(rows.find((r) => r.siteId === ids.above)).toMatchObject({ labourPercent: 33, totalPercent: 33 });
  });

  it('the Installers tab shows each confirmed quote against the average, + or − (review of PR 136)', async () => {
    const vs = async (name: (typeof NAMES)[number]) =>
      (await t.kernel.read(siteJobs, pm, { siteId: ids[name] }))[0]?.quotes[0]?.vsAverage;
    expect(await vs('above')).toEqual({ labourPercent: 33, totalPercent: 33 });
    // p1 against 100, 100, 150, 150: the average is 125, so 100 is −20 %.
    expect(await vs('p1')).toEqual({ labourPercent: -20, totalPercent: -20 });
    expect(await vs('es1')).toEqual({ labourPercent: null, totalPercent: null }); // fewer than 3 to compare
    expect(await vs('agentOnly')).toBeNull(); // not confirmed yet
    // The tab reads only its own pools (review of PR 147): a GB partial quote never meets the GB full ones.
    expect(await vs('otherScope')).toEqual({ labourPercent: null, totalPercent: null });
  });

  it('is for the alert run only', async () => {
    await expect(t.kernel.read(quoteChecks, pm, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
