// org.complianceScope.set — D-45 (3): DPIA and LPA per store (default) or once per country; directors only.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, ValidationFailed, type TestKernel } from '../../kernel/index.ts';
import { createClient } from '../commands/create-client.ts';
import { setComplianceScope } from '../commands/set-compliance-scope.ts';

const director = aStaffActor({ roles: ['director'] });
const pm = aStaffActor({ roles: ['pm'] });
let testDb: TestDatabase;
let t: TestKernel;
let clientId: string;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(director, createClient.permission, setComplianceScope.permission);
  ({ id: clientId } = await t.kernel.execute(
    createClient,
    director,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('org.complianceScope.set (D-45)', () => {
  it('a client starts per store; a director sets it per country, audited', async () => {
    const scope = (s: string) =>
      countRows(testDb.url, 'client WHERE id = $1 AND compliance_scope = $2', [clientId, s]);
    expect(await scope('site')).toBe(1);
    await t.kernel.execute(setComplianceScope, director, { clientId, scope: 'country' }, 'test');
    expect(await scope('country')).toBe(1);
    expect(await countRows(testDb.url, 'audit_event WHERE command = $1', [setComplianceScope.name])).toBe(1);
  });

  it('refuses a PM and an unknown scope', async () => {
    await expect(
      t.kernel.execute(setComplianceScope, pm, { clientId, scope: 'site' }, 'test'),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      t.kernel.execute(setComplianceScope, director, { clientId, scope: 'store' }, 'test'),
    ).rejects.toBeInstanceOf(ValidationFailed);
  });
});
