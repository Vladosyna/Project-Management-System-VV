// @ocs/testing — test infrastructure, factories, anonymised seed, fake clock, working calendars (F0.11).
// Used only from tests and vitest configs.
export { createTestDatabase, startPostgresServer, POSTGRES_IMAGE } from './postgres.ts';
export type { PostgresServer, TestDatabase } from './postgres.ts';
export { ocsVitestConfig } from './vitest.ts';
