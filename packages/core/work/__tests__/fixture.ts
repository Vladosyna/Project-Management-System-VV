// Shared setup for work tests: a fresh database with one client and one project (anonymised).
import { inject } from 'vitest';
import { aStaffActor, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';

export interface WorkWorld {
  readonly testDb: TestDatabase;
  readonly t: TestKernel;
  readonly siteId: string;
  close(): Promise<void>;
}

export async function openWorkWorld(): Promise<WorkWorld> {
  const testDb = await createTestDatabase(inject('postgresUrl'));
  const t = await openTestKernel(testDb.url);
  const setup = aStaffActor({ roles: ['director'] });
  t.grant(setup, createClient.permission, createSite.permission);
  const owner = await t.kernel.execute(
    createClient,
    setup,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  );
  const place = { countryCode: 'ES', cityCode: 'MAD', cityName: 'Madrid', name: 'Site 001', standard: 'S' };
  const { id: siteId } = await t.kernel.execute(createSite, setup, { clientId: owner.id, ...place }, 'test');
  return {
    testDb,
    t,
    siteId,
    close: async () => {
      await t.close();
      await testDb.drop();
    },
  };
}
