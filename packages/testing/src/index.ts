// @ocs/testing — test infrastructure, factories, anonymised seed, fake clock (F0.11).
// Used only from tests and vitest configs (lint: boundaries/dependencies).
export { createTestDatabase, startPostgresServer, POSTGRES_IMAGE } from './postgres.ts';
export type { PostgresServer, TestDatabase } from './postgres.ts';
export { ocsVitestConfig } from './vitest.ts';
export { createFakeClock } from './clock.ts';
export type { FakeClock } from './clock.ts';
export {
  aClientActor,
  aPartnerActor,
  aStaffActor,
  aSystemActor,
  clientLabel,
  partnerLabel,
  personLabel,
  siteLabel,
} from './factories.ts';
export { buildSeedWorld } from './seed/world.ts';
export type { SeedAction, SeedCase, SeedClient, SeedDevice, SeedSite, SeedWorld } from './seed/world.ts';
