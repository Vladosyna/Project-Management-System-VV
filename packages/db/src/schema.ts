// Drizzle table definitions. Source of truth for the database is migrations/*.sql;
// schema-drift.int.test.ts fails when these definitions and the migrated database disagree.
import { boolean, integer, jsonb, pgSchema, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const actorKinds = ['staff', 'client', 'partner', 'system'] as const;
export type ActorKind = (typeof actorKinds)[number];

export const auditEvent = pgTable('audit_event', {
  id: uuid('id').primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  actorId: uuid('actor_id').notNull(),
  actorKind: text('actor_kind', { enum: actorKinds }).notNull(),
  actorVia: text('actor_via'),
  command: text('command').notNull(),
  description: text('description').notNull(),
  objectType: text('object_type').notNull(),
  objectId: text('object_id').notNull(),
  clientId: uuid('client_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  source: text('source').notNull(),
});

export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  clientId: uuid('client_id'),
  status: text('status', { enum: ['pending', 'done', 'dead'] })
    .notNull()
    .default('pending'),
  attempts: integer('attempts').notNull().default(0),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
  lastError: text('last_error'),
});

/** Schema `auth` (migration 0002). better-auth owns the credential tables; business code reads these. */
export const authSchema = pgSchema('auth');

/** Safe user columns; credentials live in auth.account / auth."twoFactor" / auth.passkey (ocs_auth only). */
export const authUser = authSchema.table('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  twoFactorEnabled: boolean('twoFactorEnabled').default(false),
  kind: text('kind', { enum: actorKinds }).notNull(),
  archivedAt: timestamp('archivedAt', { withTimezone: true }),
});

export const invitation = authSchema.table('invitation', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  kind: text('kind', { enum: ['staff', 'client', 'partner'] }).notNull(),
  roles: text('roles').array().notNull(),
  tokenHash: text('token_hash').notNull(),
  invitedBy: uuid('invited_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedUserId: uuid('accepted_user_id'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const userRole = authSchema.table('user_role', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  role: text('role').notNull(),
  grantedBy: uuid('granted_by').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

/** Migration 0003. The tenant: its id is the client id other tables carry. Archive, never delete. */
export const client = pgTable('client', {
  id: uuid('id').primaryKey(),
  shortCode: text('short_code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0004. One SOP-DEL-02 project/site; project_id is immutable (trigger). Archive, never delete. */
export const site = pgTable('site', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  projectId: text('project_id').notNull().unique(),
  countryCode: text('country_code').notNull(),
  cityCode: text('city_code').notNull(),
  cityName: text('city_name').notNull(),
  runningNo: integer('running_no').notNull(),
  name: text('name').notNull(),
  standard: text('standard', { enum: ['L', 'S'] }).notNull(),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
