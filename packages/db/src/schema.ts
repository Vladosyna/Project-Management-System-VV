// Drizzle table definitions. Source of truth for the database is migrations/*.sql;
// schema-drift.int.test.ts fails when these definitions and the migrated database disagree.
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
