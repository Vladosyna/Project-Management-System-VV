// installer jobs and quotes (E12 AC1, AC3; D-34 N1, N5): a job per site; quotes line by line, total exact, original
// currency and EUR; a person's quote is confirmed at once, an AI agent's waits for a person; quotes compared cheapest
// first in EUR.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { createJob } from '../commands/create-job.ts';
import { proposeQuote, quoteTotal } from '../commands/propose-quote.ts';
import { partners } from '../queries/partners.ts';
import { siteJobs } from '../queries/site-jobs.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const rnd = aStaffActor({ roles: ['rnd'] });
const installerX = randomUUID();
const installerY = randomUUID();
let testDb: TestDatabase;
let t: TestKernel;
let siteA: string;
let jobId: string;
const quote = (partnerId: string, more: Record<string, unknown> = {}) => ({
  jobId,
  partnerId,
  lines: [
    { kind: 'unit', description: 'Mount and cable a sensor', quantity: 4, unitPrice: '80.00' },
    { kind: 'travel', description: 'Trip Warsaw', quantity: 1, unitPrice: '150' },
  ],
  currency: 'PLN',
  fxRate: '0.23',
  fxDate: '2026-11-26',
  source: { kind: 'pdf', ref: 'Quote 2026-114.pdf' },
  ...more,
});

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(
    pm,
    createClient.permission,
    createSite.permission,
    createJob.permission,
    proposeQuote.permission,
    siteJobs.permission,
    partners.permission,
  );
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { countryCode: 'PL', cityCode: 'WAW', cityName: 'Warsaw', name: 'Store 1', standard: 'S' };
  ({ id: siteA } = await t.kernel.execute(createSite, pm, { clientId: a.id, ...place }, 'test'));
  for (const [id, name] of [
    [installerX, 'Partner X'],
    [installerY, 'Partner Y'],
  ] as const) {
    await runAsOwner(testDb.url, `INSERT INTO partner (id, real_name, country_code) VALUES ($1, $2, 'PL')`, [
      id,
      name,
    ]);
  }
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('installer jobs and quotes', () => {
  it('totals are exact', () => {
    expect(
      quoteTotal([
        { quantity: 4, unitPrice: '80.00' },
        { quantity: 1, unitPrice: '150' },
      ]),
    ).toBe('470.00');
    expect(quoteTotal([{ quantity: 2.5, unitPrice: '33.33' }])).toBe('83.33');
  });

  it('a PM creates a job; R&D may not', async () => {
    const job = { siteId: siteA, scope: 'partial', sensorCount: 4, sowVersion: 'VV-SOW-INST v1' };
    ({ id: jobId } = await t.kernel.execute(createJob, pm, job, 'test'));
    await expect(t.kernel.execute(createJob, rnd, job, 'test')).rejects.toBeInstanceOf(Forbidden);
  });

  it("a PM's quote is confirmed at once, in PLN and EUR", async () => {
    expect(await t.kernel.execute(proposeQuote, pm, quote(installerX), 'test')).toMatchObject({
      amount: '470.00',
      eurAmount: '108.10',
      confirmed: true,
    });
  });

  it("an AI agent's quote waits for a person", async () => {
    const lines = [{ kind: 'unit', description: 'Full install per sensor', quantity: 4, unitPrice: '100' }];
    expect(await t.kernel.execute(proposeQuote, agent, quote(installerY, { lines }), 'test')).toMatchObject({
      confirmed: false,
    });
  });

  it('the site view lists the job with its quotes cheapest first in EUR', async () => {
    const [job] = await t.kernel.read(siteJobs, pm, { siteId: siteA });
    expect(job).toMatchObject({ scope: 'partial', sensorCount: 4, status: 'planned' });
    expect(job?.quotes.map((q) => [q.installer, q.eur, q.confirmed])).toEqual([
      ['Partner Y', '92.00', false],
      ['Partner X', '108.10', true],
    ]);
  });

  it('lists installer companies by name for staff', async () => {
    expect((await t.kernel.read(partners, pm, {})).map((p) => p.name)).toEqual(['Partner X', 'Partner Y']);
    await expect(t.kernel.read(partners, rnd, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
