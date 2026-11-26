// commercial.gaps.read — R14, R24, R26 (domain/rules.md, D-34 N2): only installed sites miss a PO or DPIA; only
// confirmed records close a gap; a site without a PM has no owner. System actor only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, systemActor, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { proposeRecord } from '../commands/propose-record.ts';
import { gaps } from '../queries/gaps.ts';

const pm = aStaffActor({ roles: ['pm'] });
const system = systemActor('commercial-alerts');
let testDb: TestDatabase;
let t: TestKernel;
let installed: string;
let planned: string;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, proposeRecord.permission);
  t.grant(system, gaps.permission);
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { countryCode: 'GB', cityCode: 'LON', cityName: 'London', standard: 'S' };
  ({ id: installed } = await t.kernel.execute(
    createSite,
    pm,
    { clientId: a.id, ...place, name: 'A' },
    'test',
  ));
  ({ id: planned } = await t.kernel.execute(createSite, pm, { clientId: a.id, ...place, name: 'B' }, 'test'));
  await runAsOwner(
    testDb.url,
    `INSERT INTO site_step (id, client_id, site_id, step, done_on, actor_id) VALUES ($1, $2, $3, 'installed', '2026-11-20', $4)`,
    [randomUUID(), a.id, installed, pm.id],
  );
  await runAsOwner(testDb.url, `UPDATE site SET pm_id = $1 WHERE id = $2`, [pm.id, installed]);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.gaps.read', () => {
  const read = async () => (await t.kernel.read(gaps, system, {})).sites;

  it('an installed site without PO and DPIA has both gaps; a planned one has none; no PM → R26', async () => {
    const rows = await read();
    expect(rows.find((r) => r.siteId === installed)).toMatchObject({ r14: true, r24: true, r26: false });
    expect(rows.find((r) => r.siteId === planned)).toMatchObject({ r14: false, r24: false, r26: true });
  });

  it('an AI proposal does not close a gap; a confirmed record does', async () => {
    const agent = { ...pm, via: 'mcp:test-agent' };
    const po = { siteId: installed, kind: 'client_po', reference: 'PO-1', recordDate: '2026-11-21' };
    await t.kernel.execute(proposeRecord, agent, po, 'test');
    expect((await read()).find((r) => r.siteId === installed)?.r14).toBe(true);
    await t.kernel.execute(proposeRecord, pm, { ...po, reference: 'PO-2' }, 'test');
    const dpia = { siteId: installed, kind: 'dpia', status: 'pending', recordDate: '2026-11-21' };
    await t.kernel.execute(proposeRecord, pm, dpia, 'test');
    expect((await read()).find((r) => r.siteId === installed)).toMatchObject({ r14: false, r24: true });
  });

  it('only the system actor runs it', async () => {
    await expect(t.kernel.read(gaps, pm, {})).rejects.toBeInstanceOf(Forbidden);
  });
});
