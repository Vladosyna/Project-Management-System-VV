// F0.11 "seed loads", E1: the seed world goes in through the org commands with the real permission checker,
// gets the Project IDs the seed world expects, and refuses to load twice.
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { clientList, partnerLabels, siteList } from '@ocs/core/org';
import { createRuntime, migrateDatabase, type Runtime } from '@ocs/core/runtime';
import { buildSeedWorld, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { loadSeed, SEED_ACTOR } from '../load.ts';

let testDb: TestDatabase;
let rt: Runtime;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  await migrateDatabase(testDb.url);
  rt = createRuntime({
    databaseUrl: testDb.url,
    auth: { secret: randomBytes(32).toString('hex'), baseURL: 'http://localhost' },
  });
});

afterAll(async () => {
  await rt.close();
  await testDb.drop();
});

it('loads 3 clients and 12 sites with the Project IDs of the seed world, every write audited', async () => {
  expect(await loadSeed(rt.kernel)).toEqual({ clients: 3, sites: 12, partners: 2, actions: 3 });
  const clients = await rt.kernel.read(clientList, SEED_ACTOR, {});
  expect(clients.map((c) => c.name)).toEqual(['Client A', 'Client B', 'Client C']);
  const sites = await rt.kernel.read(siteList, SEED_ACTOR, {});
  expect(sites.map((s) => s.projectId)).toEqual(
    buildSeedWorld()
      .sites.map((s) => s.projectId)
      .sort(),
  );
  expect(await countRows(testDb.url, 'audit_event WHERE actor_id = $1', [SEED_ACTOR.id])).toBe(
    3 + 1 + 12 + 2 + 3 + 3,
  );
});

it('Client C works with Partner B, its sites sit in its programme, Client B has no partner', async () => {
  const clients = await rt.kernel.read(clientList, SEED_ACTOR, {});
  const idOf = (name: string) => clients.find((c) => c.name === name)?.id ?? '';
  const labels = (name: string) => rt.kernel.read(partnerLabels, SEED_ACTOR, { clientId: idOf(name) });
  expect(await labels('Client A')).toEqual([{ label: 'Partner A' }]);
  expect(await labels('Client B')).toEqual([]);
  expect(await labels('Client C')).toEqual([{ label: 'Partner A' }, { label: 'Partner B' }]);
  expect(await countRows(testDb.url, 'site WHERE programme_id IS NOT NULL')).toBe(8);
});

it('refuses to load into a database that already has clients', async () => {
  await expect(loadSeed(rt.kernel)).rejects.toThrow(/empty database/);
});
