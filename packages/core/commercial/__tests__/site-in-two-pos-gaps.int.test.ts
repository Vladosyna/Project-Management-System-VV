// commercial.gaps.read — R13 (domain/rules.md §13, P0): a site in more than one open client PO. Open = confirmed and
// active: an AI proposal does not count until a person confirms it; an archived PO is closed. Anonymised data only.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { archiveRecord } from '../commands/archive-record.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { gaps } from '../queries/gaps.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const system = systemActor('commercial-alerts');
const NAMES = ['twoPos', 'onePo', 'secondProposed', 'secondArchived', 'noPo'] as const;
const ids = {} as Record<(typeof NAMES)[number], string>;
let testDb: TestDatabase;
let t: TestKernel;
let n = 0;

const po = async (siteId: string, actor = pm) =>
  t.kernel.execute(
    proposeRecord,
    actor,
    { siteId, kind: 'client_po', reference: `PO-${String(++n)}`, recordDate: '2026-11-20' },
    'test',
  );

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(
    pm,
    createClient.permission,
    createSite.permission,
    proposeRecord.permission,
    archiveRecord.permission,
  );
  t.grant(system, gaps.permission);
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { clientId: a.id, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  for (const name of NAMES)
    ({ id: ids[name] } = await t.kernel.execute(createSite, pm, { ...place, name }, 'test'));
  await po(ids.twoPos);
  await po(ids.twoPos);
  await po(ids.onePo);
  await po(ids.secondProposed);
  await po(ids.secondProposed, agent);
  await po(ids.secondArchived);
  const { id } = await po(ids.secondArchived);
  await t.kernel.execute(archiveRecord, pm, { recordId: id, reason: 'Entered twice' }, 'test');
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.gaps.read — R13', () => {
  it('flags a site in more than one open client PO', async () => {
    const { sites } = await t.kernel.read(gaps, system, {});
    const r13 = Object.fromEntries(
      NAMES.map((name) => [name, sites.find((s) => s.siteId === ids[name])?.r13]),
    );
    expect(r13).toEqual({
      twoPos: true,
      onePo: false,
      secondProposed: false,
      secondArchived: false,
      noPo: false,
    });
  });
});
