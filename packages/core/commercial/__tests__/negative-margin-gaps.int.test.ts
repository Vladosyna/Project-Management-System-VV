// commercial.gaps.read — R27 (domain/rules.md §27, P0): the approved installer cost of a site is above its client
// price (price list first, else the client POs; EUR). Only a CEO-approved quote on a job that is not cancelled
// counts. Anonymised data only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import type { z } from 'zod';
import { openTestKernel, systemActor, type Command, type TestKernel } from '../../kernel/index.ts';
import { createJob, proposeQuote, recordApproval, setJobStatus } from '../../installers/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { gaps } from '../queries/gaps.ts';

const pm = aStaffActor({ roles: ['pm'] });
const system = systemActor('commercial-alerts');
const partner = randomUUID();
let testDb: TestDatabase;
let t: TestKernel;
const NAMES = ['above', 'equal', 'poOnly', 'priceListWins', 'notApproved', 'cancelled', 'noPrice'] as const;
const ids = {} as Record<(typeof NAMES)[number], string>;
const run = <S extends z.ZodType, R>(cmd: Command<S, R>, input: unknown) =>
  t.kernel.execute(cmd, pm, input, 'test');

/** A job on the site with one quote of 2 × unitPrice EUR (entered by a person: confirmed at once); approved by the CEO unless told otherwise. */
async function quoted(siteId: string, unitPrice: string, approve = true) {
  const job = await run(createJob, { siteId, scope: 'full', sensorCount: 2, sowVersion: 'v1' });
  const lines = [{ kind: 'unit', description: 'Sensor', quantity: 2, unitPrice }];
  const { id } = await run(proposeQuote, {
    jobId: job.id,
    partnerId: partner,
    lines,
    currency: 'EUR',
    fxDate: '2026-11-26',
    source: { kind: 'mail' },
  });
  if (approve)
    await run(recordApproval, {
      jobId: job.id,
      quoteId: id,
      approvalRef: `OA-${id.slice(0, 8)}`,
      approvedOn: '2026-11-26',
      singleQuoteReason: 'Urgent: one installer in the city',
    });
  return job.id;
}

const price = (siteId: string, kind: 'price_list' | 'client_po', amount: string, reference?: string) =>
  run(proposeRecord, {
    siteId,
    kind,
    ...(reference ? { reference } : {}),
    recordDate: '2026-11-20',
    money: { amount, currency: 'EUR' },
  });

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, proposeRecord.permission, createJob.permission);
  t.grant(pm, proposeQuote.permission, recordApproval.permission, setJobStatus.permission);
  t.grant(system, gaps.permission);
  await runAsOwner(
    testDb.url,
    `INSERT INTO partner (id, real_name, country_code) VALUES ($1, 'Partner', 'GB')`,
    [partner],
  );
  const a = await run(createClient, { shortCode: 'CLIENTA', name: 'Client A' });
  const place = { clientId: a.id, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  for (const name of NAMES) ({ id: ids[name] } = await run(createSite, { ...place, name }));

  await price(ids.above, 'price_list', '100.00');
  await quoted(ids.above, '60.00'); // 120 > 100
  await price(ids.equal, 'price_list', '120.00');
  await quoted(ids.equal, '60.00'); // 120 = 120
  await price(ids.poOnly, 'client_po', '100.00', 'PO-1');
  await quoted(ids.poOnly, '60.00'); // 120 > PO 100
  await price(ids.priceListWins, 'client_po', '100.00', 'PO-2');
  await price(ids.priceListWins, 'price_list', '200.00');
  await quoted(ids.priceListWins, '60.00'); // 120 ≤ 200
  await price(ids.notApproved, 'price_list', '100.00');
  await quoted(ids.notApproved, '500.00', false); // confirmed, not approved
  await price(ids.cancelled, 'price_list', '100.00');
  await run(setJobStatus, { jobId: await quoted(ids.cancelled, '500.00'), status: 'cancelled' });
  await quoted(ids.noPrice, '500.00');
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.gaps.read — R27', () => {
  it('flags an approved installer cost above the client price', async () => {
    const { sites } = await t.kernel.read(gaps, system, {});
    const r27 = Object.fromEntries(
      Object.entries(ids).map(([name, id]) => [name, sites.find((s) => s.siteId === id)?.r27]),
    );
    expect(r27).toEqual({
      above: true,
      equal: false,
      poOnly: true,
      priceListWins: false,
      notApproved: false,
      cancelled: false,
      noPrice: false,
    });
  });
});
