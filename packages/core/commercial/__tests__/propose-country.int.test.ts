// commercial.country.propose / .confirm — D-45 (3)(4): a client's DPIA or LPA for a whole country. A new one replaces
// the active one (archived, never deleted); an AI agent's waits for a person; an agent cannot confirm. Anonymised data.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  Conflict,
  Forbidden,
  NotFound,
  openTestKernel,
  ValidationFailed,
  type TestKernel,
} from '../../kernel/index.ts';
import { createClient } from '../../org/index.ts';
import { confirmCountry } from '../commands/confirm-country.ts';
import { proposeCountry } from '../commands/propose-country.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const sales = aStaffActor({ roles: ['sales'] });
let testDb: TestDatabase;
let t: TestKernel;
let clientId: string;
const lpa = (more: Record<string, unknown> = {}) => ({
  clientId,
  countryCode: 'ES',
  kind: 'lpa',
  status: 'approved',
  reference: 'LPA-ES-1',
  recordDate: '2026-11-20',
  ...more,
});
const active = () =>
  countRows(testDb.url, "country_compliance WHERE client_id = $1 AND kind = 'lpa' AND archived_at IS NULL", [
    clientId,
  ]);

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, proposeCountry.permission, confirmCountry.permission);
  ({ id: clientId } = await t.kernel.execute(
    createClient,
    pm,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('commercial.country.propose / confirm (D-45)', () => {
  it('a person records a country LPA, confirmed at once; a new one replaces it', async () => {
    const first = await t.kernel.execute(proposeCountry, pm, lpa(), 'test');
    expect(first).toMatchObject({ confirmed: true, replaced: null });
    const second = await t.kernel.execute(proposeCountry, pm, lpa({ reference: 'LPA-ES-2' }), 'test');
    expect(second.replaced).toBe(first.id);
    expect(await active()).toBe(1);
    expect(
      await countRows(testDb.url, 'country_compliance WHERE id = $1 AND archived_at IS NOT NULL', [first.id]),
    ).toBe(1);
  });

  it("an AI agent's record waits for a person; the agent cannot confirm it", async () => {
    const { id, confirmed } = await t.kernel.execute(
      proposeCountry,
      agent,
      lpa({ countryCode: 'PT' }),
      'test',
    );
    expect(confirmed).toBe(false);
    await expect(t.kernel.execute(confirmCountry, agent, { recordId: id }, 'test')).rejects.toBeInstanceOf(
      Forbidden,
    );
    await t.kernel.execute(confirmCountry, pm, { recordId: id }, 'test');
    await expect(t.kernel.execute(confirmCountry, pm, { recordId: id }, 'test')).rejects.toBeInstanceOf(
      Conflict,
    );
  });

  it('refuses a role without the permission, a bad country code and an unknown client', async () => {
    await expect(t.kernel.execute(proposeCountry, sales, lpa(), 'test')).rejects.toBeInstanceOf(Forbidden);
    await expect(
      t.kernel.execute(proposeCountry, pm, lpa({ countryCode: 'es' }), 'test'),
    ).rejects.toBeInstanceOf(ValidationFailed);
    await expect(
      t.kernel.execute(proposeCountry, pm, lpa({ clientId: randomUUID() }), 'test'),
    ).rejects.toBeInstanceOf(NotFound);
  });
});
