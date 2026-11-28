// commercial.gaps.read — D-44 (3), D-45 (1): a client PO or client invoice may cover a batch of stores
// (commercial_record_site_link, #139). A store linked to a confirmed, active batch PO has a PO for R14 and counts it
// for R13; a linked batch invoice clears R5. An archived link or an AI-proposed PO does not count, and a DPIA is never
// spread through links (D-45 (3): per store or per country). Anonymised data only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { gaps } from '../queries/gaps.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const system = systemActor('commercial-alerts');
const NAMES = ['entered', 'covered', 'coveredAndOwn', 'linkArchived', 'proposedBatch', 'agentStore'] as const;
const MORE = ['invoiceCovered', 'dpiaLinked'] as const;
const ids = {} as Record<(typeof NAMES)[number] | (typeof MORE)[number], string>;
let testDb: TestDatabase;
let t: TestKernel;
let clientId: string;
let n = 0;

const po = async (siteId: string, actor = pm) =>
  t.kernel.execute(
    proposeRecord,
    actor,
    { siteId, kind: 'client_po', reference: `PO-${String(++n)}`, recordDate: '2026-11-20' },
    'test',
  );
const link = (recordId: string, siteId: string, archived = false) =>
  runAsOwner(
    testDb.url,
    `INSERT INTO commercial_record_site_link (record_id, client_id, site_id, created_by, archived_at)
     VALUES ($1, $2, $3, $4, ${archived ? 'now()' : 'NULL'})`,
    [recordId, clientId, siteId, pm.id],
  );

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, proposeRecord.permission);
  t.grant(system, gaps.permission);
  ({ id: clientId } = await t.kernel.execute(
    createClient,
    pm,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
  const place = { clientId, countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  for (const name of [...NAMES, ...MORE]) {
    ({ id: ids[name] } = await t.kernel.execute(createSite, pm, { ...place, name }, 'test'));
    await runAsOwner(
      testDb.url,
      `INSERT INTO site_step (id, client_id, site_id, step, done_on, actor_id) VALUES ($1, $2, $3, 'installed', '2026-11-20', $4)`,
      [randomUUID(), clientId, ids[name], pm.id],
    );
  }
  const batch = await po(ids.entered);
  await link(batch.id, ids.covered);
  await link(batch.id, ids.coveredAndOwn);
  await po(ids.coveredAndOwn);
  await link(batch.id, ids.linkArchived, true);
  const proposed = await po(ids.agentStore, agent);
  await link(proposed.id, ids.proposedBatch);
  // Accepted well over 5 working days ago, with only a batch invoice entered on another store.
  await runAsOwner(
    testDb.url,
    `INSERT INTO site_step (id, client_id, site_id, step, done_on, actor_id) VALUES ($1, $2, $3, 'accepted', '2026-11-02', $4)`,
    [randomUUID(), clientId, ids.invoiceCovered, pm.id],
  );
  const record = (kind: string, status: string) =>
    t.kernel.execute(
      proposeRecord,
      pm,
      { siteId: ids.entered, kind, status, reference: `${kind}-1`, recordDate: '2026-11-20' },
      'test',
    );
  await link((await record('client_invoice', 'issued')).id, ids.invoiceCovered);
  await link((await record('dpia', 'approved')).id, ids.dpiaLinked);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.gaps.read — a batch PO covers its linked stores (D-44)', () => {
  it('R14 and R13 count a confirmed batch PO for every active link', async () => {
    const { sites } = await t.kernel.read(gaps, system, {});
    const flags = Object.fromEntries(
      NAMES.map((name) => {
        const row = sites.find((s) => s.siteId === ids[name]);
        return [name, { r14: row?.r14, r13: row?.r13 }];
      }),
    );
    expect(flags).toEqual({
      entered: { r14: false, r13: false },
      covered: { r14: false, r13: false },
      coveredAndOwn: { r14: false, r13: true },
      linkArchived: { r14: true, r13: false },
      proposedBatch: { r14: true, r13: false },
      agentStore: { r14: true, r13: false },
    });
  });

  it('a linked batch invoice clears R5; a linked DPIA does not clear R24 (D-45)', async () => {
    const { sites } = await t.kernel.read(gaps, system, {});
    expect(sites.find((s) => s.siteId === ids.invoiceCovered)?.r5).toBe(false);
    expect(sites.find((s) => s.siteId === ids.dpiaLinked)?.r24).toBe(true);
  });
});
