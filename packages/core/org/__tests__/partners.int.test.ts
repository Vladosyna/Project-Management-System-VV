// Partners — E1 AC4 and CLAUDE.md §3 rule 5: real names are staff-only; a client sees its partners as
// Partner A/B/C, letters given per client in order of assignment and never reused. Replaces the four
// generated guard tests (create, assign, labels, list) with one flow; the guard cases are kept below.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aClientActor, aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { Conflict, Forbidden, NotFound, openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { assignPartner } from '../commands/assign-partner.ts';
import { createClient } from '../commands/create-client.ts';
import { createPartner } from '../commands/create-partner.ts';
import { partnerLabels } from '../queries/partner-labels.ts';
import { partnerList } from '../queries/partner-list.ts';

const NAMES = ['Installer Company 01', 'Installer Company 02', 'Installer Company 03'];
const director = aStaffActor({ roles: ['director'] });
const other = aStaffActor();
let testDb: TestDatabase;
let t: TestKernel;
let clientA: string;
let clientB: string;
const partners: string[] = [];

const assign = (clientId: string, partnerId: string) =>
  t.kernel.execute(assignPartner, director, { clientId, partnerId }, 'test');

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(director, createClient.permission, createPartner.permission, assignPartner.permission);
  t.grant(director, partnerLabels.permission, partnerList.permission);
  clientA = (
    await t.kernel.execute(createClient, director, { shortCode: 'CLIENTA', name: 'Client A' }, 'test')
  ).id;
  clientB = (
    await t.kernel.execute(createClient, director, { shortCode: 'CLIENTB', name: 'Client B' }, 'test')
  ).id;
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('partners (E1 AC4)', () => {
  it('refuses actors without the permissions', async () => {
    await expect(
      t.kernel.execute(createPartner, other, { realName: NAMES[0], countryCode: 'ES' }, 'test'),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(t.kernel.read(partnerList, other, {})).rejects.toBeInstanceOf(Forbidden);
  });

  it('registers partners, audited without a client', async () => {
    for (const realName of NAMES) {
      partners.push(
        (await t.kernel.execute(createPartner, director, { realName, countryCode: 'es' }, 'test')).id,
      );
    }
    expect(
      await countRows(testDb.url, `audit_event WHERE command = 'org.partner.create' AND client_id IS NULL`),
    ).toBe(3);
  });

  it('gives letters per client in order of assignment: the same partner can be A for one client and B for another', async () => {
    const [p1 = '', p2 = '', p3 = ''] = partners;
    expect(await assign(clientA, p1)).toEqual({ label: 'Partner A' });
    expect(await assign(clientA, p2)).toEqual({ label: 'Partner B' });
    expect(await assign(clientB, p3)).toEqual({ label: 'Partner A' });
    expect(await assign(clientB, p1)).toEqual({ label: 'Partner B' });
  });

  it('refuses assigning a partner twice to one client, and unknown clients or partners', async () => {
    await expect(assign(clientA, partners[0] ?? '')).rejects.toBeInstanceOf(Conflict);
    await expect(assign(randomUUID(), partners[0] ?? '')).rejects.toBeInstanceOf(NotFound);
    await expect(assign(clientA, randomUUID())).rejects.toBeInstanceOf(NotFound);
  });

  it('a client sees only its own Partner letters and never a real name (P0, CLAUDE.md §3 rule 5)', async () => {
    const userOfA = aClientActor(clientA);
    t.grant(userOfA, partnerLabels.permission);
    const seen = await t.kernel.read(partnerLabels, userOfA, { clientId: clientA });
    expect(seen).toEqual([{ label: 'Partner A' }, { label: 'Partner B' }]);
    const asText = JSON.stringify(seen);
    for (const name of NAMES) expect(asText).not.toContain(name);
    // Asking for another client's partners returns nothing (RLS).
    expect(await t.kernel.read(partnerLabels, userOfA, { clientId: clientB })).toEqual([]);
  });

  it('staff see real names with each client letter', async () => {
    const list = await t.kernel.read(partnerList, director, {});
    expect(list.find((p) => p.realName === NAMES[0])).toMatchObject({
      countryCode: 'ES',
      labels: [
        { clientId: clientA, label: 'Partner A' },
        { clientId: clientB, label: 'Partner B' },
      ],
    });
  });
});
