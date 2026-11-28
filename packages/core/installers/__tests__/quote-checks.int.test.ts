// installers.quoteChecks.read — R29 (domain/rules.md §29, P1): a confirmed installer quote whose hour lines are above
// the time standard (partial N + 2 h, full 2N + 2 h), while the job is being quoted. An AI proposal does not count
// until a person confirms it; an approved or cancelled job is no longer checked. The system actor only. Anonymised.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { createJob } from '../commands/create-job.ts';
import { proposeQuote } from '../commands/propose-quote.ts';
import { recordApproval } from '../commands/record-approval.ts';
import { setJobStatus } from '../commands/set-job-status.ts';
import { quoteChecks } from '../queries/quote-checks.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const system = systemActor('installer-alerts');
const partner = randomUUID();
const NAMES = ['over', 'atStandard', 'agentOnly', 'approved', 'cancelled', 'unitOnly'] as const;
const ids = {} as Record<(typeof NAMES)[number], string>;
let testDb: TestDatabase;
let t: TestKernel;

/** A full-scope job with 4 sensors (standard 10 h) and one quote with the given lines. */
async function quote(siteId: string, lines: { kind: string; quantity: number }[], actor = pm) {
  const job = await t.kernel.execute(
    createJob,
    pm,
    { siteId, scope: 'full', sensorCount: 4, sowVersion: 'v1' },
    'test',
  );
  const { id } = await t.kernel.execute(
    proposeQuote,
    actor,
    {
      jobId: job.id,
      partnerId: partner,
      lines: lines.map((l) => ({ ...l, description: 'Line', unitPrice: '40' })),
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
  t.grant(pm, recordApproval.permission, setJobStatus.permission);
  t.grant(system, quoteChecks.permission);
  await runAsOwner(
    testDb.url,
    `INSERT INTO partner (id, real_name, country_code) VALUES ($1, 'Partner', 'GB')`,
    [partner],
  );
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { clientId: a.id, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  for (const name of NAMES)
    ({ id: ids[name] } = await t.kernel.execute(createSite, pm, { ...place, name }, 'test'));

  await quote(ids.over, [{ kind: 'hour', quantity: 12 }]);
  await quote(ids.atStandard, [{ kind: 'hour', quantity: 10 }]);
  await quote(ids.agentOnly, [{ kind: 'hour', quantity: 20 }], agent);
  const approved = await quote(ids.approved, [{ kind: 'hour', quantity: 12 }]);
  await t.kernel.execute(
    recordApproval,
    pm,
    {
      ...approved,
      approvalRef: 'OA-1',
      approvedOn: '2026-11-26',
      singleQuoteReason: 'Urgent: one installer in the city',
    },
    'test',
  );
  const cancelled = await quote(ids.cancelled, [{ kind: 'hour', quantity: 12 }]);
  await t.kernel.execute(setJobStatus, pm, { jobId: cancelled.jobId, status: 'cancelled' }, 'test');
  await quote(ids.unitOnly, [{ kind: 'unit', quantity: 30 }]);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('installers.quoteChecks.read — R29', () => {
  it('flags a confirmed quote above the time standard while the job is being quoted', async () => {
    const rows = await t.kernel.read(quoteChecks, system, {});
    const r29 = Object.fromEntries(NAMES.map((n) => [n, rows.find((r) => r.siteId === ids[n])?.r29]));
    expect(r29).toEqual({
      over: true,
      atStandard: false,
      agentOnly: false,
      approved: false,
      cancelled: false,
      unitOnly: false,
    });
    expect(rows.find((r) => r.siteId === ids.over)).toMatchObject({ quotedHours: 12, standardHours: 10 });
  });

  it('is for the alert run only', async () => {
    await expect(t.kernel.read(quoteChecks, pm, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
