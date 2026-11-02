// @ocs/db — Drizzle schema, migrations, RLS context [protected].
// Imported only by repositories, core/kernel and packages/testing (lint: ocs/no-db-import).
export { createAuthPool, createDatabase } from './client.ts';
export type { Database, Db, Tx } from './client.ts';
export { inActorTransaction } from './actor-context.ts';
export type { DbActor } from './actor-context.ts';
export { listMigrations, migrateUp, migrateDown } from './migrate.ts';
export type { Migration } from './migrate.ts';
export { actorKinds, auditEvent, authUser, invitation, outbox, userRole } from './schema.ts';
export type { ActorKind } from './schema.ts';
// Query helpers, re-exported so every package uses this package's drizzle-orm instance.
export { and, asc, desc, eq, inArray, isNull, isNotNull, or, sql } from 'drizzle-orm';
export { client } from './schema.ts';
export { site } from './schema.ts';
export { programme } from './schema.ts';
export { partner, partnerAssignment } from './schema.ts';
export { DEVICE_STATUSES, device } from './schema.ts';
export { handoverCard } from './schema.ts';
