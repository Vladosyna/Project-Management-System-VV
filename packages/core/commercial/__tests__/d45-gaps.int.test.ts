// commercial.gaps.read — D-45: R24 accepts the country DPIA for per-country clients; R40 flags a confirmed PO without
// the country's approved LPA (per-country clients only); R13 lets a hardware PO and an installation PO coexist.
// Anonymised data only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import type { z } from 'zod';
import { openTestKernel, systemActor, type Command, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite, setComplianceScope } from '../../org/index.ts';
import { proposeCountry } from '../commands/propose-country.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { gaps } from '../queries/gaps.ts';

const director = aStaffActor({ roles: ['director'] });
const system = systemActor('commercial-alerts');
let testDb: TestDatabase;
let t: TestKernel;
const ids: Record<string, string> = {};
let n = 0;
const run = <S extends z.ZodType, R>(cmd: Command<S, R>, input: unknown) =>
  t.kernel.execute(cmd, director, input, 'test');
const po = (siteId: string, part: string) =>
  runAsOwner(
    testDb.url,
    `INSERT INTO commercial_record (id, client_id, site_id, kind, part, reference, status, record_date, proposed_by,
       proposed_via, confirmed_by, confirmed_at)
     SELECT $1, client_id, id, 'client_po', $2, $3, 'received', '2026-11-20', $4, 'web', $4, now() FROM site WHERE id = $5`,
    [randomUUID(), part, `PO-${String(++n)}`, director.id, siteId],
  );

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(director, createClient.permission, createSite.permission, setComplianceScope.permission);
  t.grant(director, proposeCountry.permission, proposeRecord.permission);
  t.grant(system, gaps.permission);
  const a = await run(createClient, { shortCode: 'CLIENTA', name: 'Client A' });
  const b = await run(createClient, { shortCode: 'CLIENTB', name: 'Client B' });
  await run(setComplianceScope, { clientId: a.id, scope: 'country' });
  const at = (clientId: string, countryCode: string, cityCode: string) => ({
    clientId,
    countryCode,
    cityCode,
    cityName: cityCode,
    standard: 'S',
  });
  for (const [name, place] of [
    ['esCovered', at(a.id, 'ES', 'MAD')],
    ['ptNoLpa', at(a.id, 'PT', 'LIS')],
    ['perStore', at(b.id, 'ES', 'MAD')],
    ['twoParts', at(b.id, 'ES', 'BCN')],
  ] as const)
    ({ id: ids[name] } = await run(createSite, { ...place, name }));
  for (const id of Object.values(ids))
    await runAsOwner(
      testDb.url,
      `INSERT INTO site_step (id, client_id, site_id, step, done_on, actor_id)
       SELECT $1, client_id, id, 'installed', '2026-11-20', $2 FROM site WHERE id = $3`,
      [randomUUID(), director.id, id],
    );
  const country = { clientId: a.id, status: 'approved', recordDate: '2026-11-01' };
  await run(proposeCountry, { ...country, countryCode: 'ES', kind: 'dpia' });
  await run(proposeCountry, { ...country, countryCode: 'ES', kind: 'lpa' });
  await run(proposeCountry, { ...country, countryCode: 'PT', kind: 'dpia', status: 'pending' });
  for (const name of ['esCovered', 'ptNoLpa', 'perStore'] as const) await po(ids[name] ?? '', 'all');
  await po(ids.twoParts ?? '', 'hardware');
  await po(ids.twoParts ?? '', 'installation');
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.gaps.read — D-45', () => {
  it('country DPIA clears R24, country LPA clears R40, hardware + installation POs pass R13', async () => {
    const { sites } = await t.kernel.read(gaps, system, {});
    const flags = Object.fromEntries(
      Object.entries(ids).map(([name, id]) => {
        const row = sites.find((s) => s.siteId === id);
        return [name, { r24: row?.r24, r40: row?.r40, r13: row?.r13 }];
      }),
    );
    expect(flags).toEqual({
      esCovered: { r24: false, r40: false, r13: false },
      ptNoLpa: { r24: true, r40: true, r13: false },
      perStore: { r24: true, r40: false, r13: false },
      twoParts: { r24: true, r40: false, r13: false },
    });
  });
});
