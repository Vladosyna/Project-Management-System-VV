// @ocs/db — Drizzle schema, migrations, RLS context [protected].
// Imported only by repositories, core/kernel and packages/testing (lint: ocs/no-db-import).
export { createDatabase } from './client.ts';
export type { Database, Db, Tx } from './client.ts';
export { inActorTransaction } from './actor-context.ts';
export type { DbActor } from './actor-context.ts';
export { listMigrations, migrateUp, migrateDown } from './migrate.ts';
export type { Migration } from './migrate.ts';
export { auditEvent, outbox, actorKinds } from './schema.ts';
export type { ActorKind } from './schema.ts';
