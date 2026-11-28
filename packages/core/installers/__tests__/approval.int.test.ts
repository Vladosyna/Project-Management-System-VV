// Quote confirmation, CEO approval and job status (E12 AC4–AC6; P-11, P-12; 08-ai-and-mcp): a person confirms and
// records the approval, never an agent; two comparable quotes or a reason; one approval per job; status in order.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import type { z } from 'zod';
import {
  Conflict,
  Forbidden,
  openTestKernel,
  RuleViolation,
  type Command,
  type TestKernel,
} from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { confirmQuote } from '../commands/confirm-quote.ts';
import { createJob } from '../commands/create-job.ts';
import { proposeQuote } from '../commands/propose-quote.ts';
import { recordApproval } from '../commands/record-approval.ts';
import { setJobStatus } from '../commands/set-job-status.ts';
import { siteJobs } from '../queries/site-jobs.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const [x, y] = [randomUUID(), randomUUID()];
let testDb: TestDatabase;
let t: TestKernel;
let siteA: string;
const run = <S extends z.ZodType, R>(cmd: Command<S, R>, input: unknown, actor = pm) =>
  t.kernel.execute(cmd, actor, input, 'test');
const quote = (jobId: string, partnerId: string, unitPrice = '80') => ({
  jobId,
  partnerId,
  lines: [{ kind: 'unit', description: 'Sensor', quantity: 2, unitPrice }],
  currency: 'EUR',
  fxDate: '2026-11-26',
  source: { kind: 'mail' },
});
const newJob = async () => run(createJob, { siteId: siteA, scope: 'full', sensorCount: 2, sowVersion: 'v1' });

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, createJob.permission, proposeQuote.permission);
  t.grant(
    pm,
    confirmQuote.permission,
    recordApproval.permission,
    setJobStatus.permission,
    siteJobs.permission,
  );
  const a = await run(createClient, { shortCode: 'CLIENTA', name: 'Client A' });
  const place = { countryCode: 'PL', cityCode: 'WAW', cityName: 'Warsaw', name: 'Store 1', standard: 'S' };
  ({ id: siteA } = await run(createSite, { clientId: a.id, ...place }));
  for (const id of [x, y]) {
    await runAsOwner(
      testDb.url,
      `INSERT INTO partner (id, real_name, country_code) VALUES ($1, 'Partner', 'PL')`,
      [id],
    );
  }
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('quote approval and job status', () => {
  it('a person confirms an agent quote; the agent may not; only once', async () => {
    const job = await newJob();
    const { id } = await run(proposeQuote, quote(job.id, x), agent);
    await expect(run(confirmQuote, { quoteId: id }, agent)).rejects.toBeInstanceOf(Forbidden);
    await run(confirmQuote, { quoteId: id });
    await expect(run(confirmQuote, { quoteId: id })).rejects.toBeInstanceOf(Conflict);
  });

  it('one quote needs a reason (P-12); two comparable quotes do not; one approval per job', async () => {
    const job = await newJob();
    const { id: cheap } = await run(proposeQuote, quote(job.id, x));
    const approval = { jobId: job.id, quoteId: cheap, approvalRef: 'OA-1', approvedOn: '2026-11-26' };
    await expect(run(recordApproval, approval)).rejects.toBeInstanceOf(RuleViolation);
    await expect(run(recordApproval, approval, agent)).rejects.toBeInstanceOf(Forbidden);
    await run(proposeQuote, quote(job.id, y, '95'));
    expect(await run(recordApproval, approval)).toMatchObject({ comparableQuotes: 2 });
    await expect(run(recordApproval, approval)).rejects.toBeInstanceOf(Conflict);
    const [, approved] = await t.kernel.read(siteJobs, pm, { siteId: siteA });
    expect(approved?.status).toBe('approved');
  });

  it('quotes on different SOW versions are not comparable (P-12)', async () => {
    const job = await newJob();
    const { id } = await run(proposeQuote, quote(job.id, x));
    await run(proposeQuote, { ...quote(job.id, y), sowVersion: 'v2' });
    const approval = { jobId: job.id, quoteId: id, approvalRef: 'OA-3', approvedOn: '2026-11-26' };
    await expect(run(recordApproval, approval)).rejects.toBeInstanceOf(RuleViolation);
  });

  it('a single urgent quote with a reason; then scheduled, then the visit outcome', async () => {
    const job = await newJob();
    const { id } = await run(proposeQuote, quote(job.id, x));
    await expect(
      run(setJobStatus, { jobId: job.id, status: 'scheduled', scheduledOn: '2026-12-01' }),
    ).rejects.toBeInstanceOf(RuleViolation);
    const reason = { singleQuoteReason: 'Store opens Monday; no second installer free' };
    await run(recordApproval, {
      jobId: job.id,
      quoteId: id,
      approvalRef: 'OA-2',
      approvedOn: '2026-11-26',
      ...reason,
    });
    await expect(run(setJobStatus, { jobId: job.id, status: 'scheduled' })).rejects.toBeInstanceOf(
      RuleViolation,
    );
    await run(setJobStatus, { jobId: job.id, status: 'scheduled', scheduledOn: '2026-12-01' });
    await expect(run(setJobStatus, { jobId: job.id, status: 'attended_not_ready' })).rejects.toBeInstanceOf(
      RuleViolation,
    );
    await run(setJobStatus, {
      jobId: job.id,
      status: 'attended_not_ready',
      note: 'No ladder, ceiling closed',
    });
  });
});
