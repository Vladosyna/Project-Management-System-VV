// commercial.gaps.read — R5 (domain/rules.md §5, P1): a project accepted 5 working days ago or more without a
// confirmed client invoice. An AI proposal does not close the gap; a confirmed invoice does. Anonymised data only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  aStaffActor,
  createFakeClock,
  createTestDatabase,
  runAsOwner,
  type TestDatabase,
} from '@ocs/testing';
import { openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { gaps } from '../queries/gaps.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const system = systemActor('commercial-alerts');
const clock = createFakeClock(new Date('2026-11-23T09:00:00Z')); // Monday
let testDb: TestDatabase;
let t: TestKernel;
const ids: Record<string, string> = {};

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url, { clock: clock.now });
  t.grant(pm, createClient.permission, createSite.permission, proposeRecord.permission);
  t.grant(system, gaps.permission);
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { clientId: a.id, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  // GB working days: accepted Mon 16 Nov → 5 working days on Mon 23 Nov (today); Tue 17 Nov → Tue 24 Nov.
  const accepted: [string, string | null][] = [
    ['day5', '2026-11-16'],
    ['day4', '2026-11-17'],
    ['invoiced', '2026-11-16'],
    ['proposedOnly', '2026-11-16'],
    ['notAccepted', null],
  ];
  for (const [name, on] of accepted) {
    ({ id: ids[name] } = await t.kernel.execute(createSite, pm, { ...place, name }, 'test'));
    if (on)
      await runAsOwner(
        testDb.url,
        `INSERT INTO site_step (id, client_id, site_id, step, done_on, actor_id) VALUES ($1, $2, $3, 'accepted', $4, $5)`,
        [randomUUID(), a.id, ids[name], on, pm.id],
      );
  }
  const invoice = { kind: 'client_invoice', status: 'issued', recordDate: '2026-11-20' };
  await t.kernel.execute(proposeRecord, pm, { ...invoice, reference: 'INV-1', siteId: ids.invoiced }, 'test');
  await t.kernel.execute(
    proposeRecord,
    agent,
    { ...invoice, reference: 'INV-2', siteId: ids.proposedOnly },
    'test',
  );
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.gaps.read — R5', () => {
  it('flags acceptance ≥ 5 working days ago without a confirmed client invoice', async () => {
    const { sites } = await t.kernel.read(gaps, system, {});
    const r5 = Object.fromEntries(
      Object.entries(ids).map(([name, id]) => [name, sites.find((s) => s.siteId === id)?.r5]),
    );
    expect(r5).toEqual({ day5: true, day4: false, invoiced: false, proposedOnly: true, notAccepted: false });
  });
});
