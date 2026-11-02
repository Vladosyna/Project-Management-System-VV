// Shared setup for work tests: a fresh database with one client and one project (anonymised).
import { inject } from 'vitest';
import type { Actor } from '@ocs/contracts';
import { aStaffActor, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { openTestKernel, type TestKernel } from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';

export interface WorkWorld {
  readonly testDb: TestDatabase;
  readonly t: TestKernel;
  readonly siteId: string;
  /** Registers an account for this actor (mentions only notify real, active staff accounts). */
  account(actor: Actor, archived?: boolean): Promise<Actor>;
  close(): Promise<void>;
}

export async function openWorkWorld(options: { clock?: () => Date } = {}): Promise<WorkWorld> {
  const testDb = await createTestDatabase(inject('postgresUrl'));
  const t = await openTestKernel(testDb.url, options);
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
    account: async (actor, archived = false) => {
      await runAsOwner(
        testDb.url,
        `INSERT INTO auth."user" (id, name, email, kind, "archivedAt") VALUES ($1, $2, $3, $4, $5)`,
        [actor.id, 'Person', `${actor.id}@example.com`, actor.kind, archived ? new Date() : null],
      );
      return actor;
    },
    close: async () => {
      await t.close();
      await testDb.drop();
    },
  };
}
