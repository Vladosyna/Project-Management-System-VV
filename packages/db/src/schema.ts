// Drizzle table definitions. Source of truth for the database is migrations/*.sql;
// schema-drift.int.test.ts fails when these definitions and the migrated database disagree.
import {
  boolean,
  date,
  inet,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

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
  programmeId: uuid('programme_id'),
  salesOwnerId: uuid('sales_owner_id'),
  pmId: uuid('pm_id'),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0005. Optional level under a client (SOP-DEL-02 §3). Archive, never delete. */
export const programme = pgTable('programme', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0006. Real partner names — staff only (CLAUDE.md §3 rule 5). Archive, never delete. */
export const partner = pgTable('partner', {
  id: uuid('id').primaryKey(),
  realName: text('real_name').notNull(),
  countryCode: text('country_code').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0006. A partner working for a client; the client sees only `Partner <letter>`. */
export const partnerAssignment = pgTable('partner_assignment', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  partnerId: uuid('partner_id').notNull(),
  letter: text('letter').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Device life cycle (data-model.md "Device"); the CHECK in migration 0007 lists the same values. */
export const DEVICE_STATUSES = [
  'planned',
  'shipped',
  'received',
  'installed',
  'online',
  'calibrated',
  'faulty',
  'lost',
] as const;

/** Migration 0007. One device in the registry (E4); SN and MAC unique among active rows (R6). Archive, never delete. */
export const device = pgTable('device', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  sn: text('sn').notNull(),
  mac: text('mac'),
  model: text('model').notNull(),
  firmware: text('firmware'),
  switchName: text('switch_name'),
  switchPort: text('switch_port'),
  ip: inet('ip'),
  status: text('status', { enum: DEVICE_STATUSES }).notNull().default('planned'),
  replacedById: uuid('replaced_by_id'),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Handover Card life cycle (SOP-DEL-01 §8); the CHECK in migration 0008 lists the same values. */
export const HANDOVER_CARD_STATUSES = [
  'draft',
  'submitted',
  'accepted',
  'accepted_with_conditions',
  'returned',
] as const;

/** Migration 0008. One version of a project's Handover Card (SOP-DEL-01 Annex B). Internal only. */
export const handoverCard = pgTable('handover_card', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  version: integer('version').notNull(),
  package: text('package', { enum: ['full', 'light'] }).notNull(),
  status: text('status', { enum: HANDOVER_CARD_STATUSES }).notNull().default('draft'),
  content: jsonb('content').notNull().default({}),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  submittedBy: uuid('submitted_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0008. One SOP-DEL-01 §6 checklist item covered by a card: provided, or N/A with a reason. */
export const handoverItem = pgTable('handover_item', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  cardId: uuid('card_id').notNull(),
  code: text('code').notNull(),
  status: text('status', { enum: ['provided', 'na'] }).notNull(),
  value: text('value'),
  fileRef: text('file_ref'),
  naReason: text('na_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0009. Delivery's decision on one Handover Card version (SOP-DEL-01 §8). Internal only. */
export const intakeDecision = pgTable('intake_decision', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  cardId: uuid('card_id').notNull().unique(),
  decision: text('decision', { enum: ['accepted', 'accepted_with_conditions', 'returned'] }).notNull(),
  folderStandard: text('folder_standard', { enum: ['L', 'S', 'mixed'] }).notNull(),
  reasons: text('reasons'),
  assignedPmId: uuid('assigned_pm_id'),
  handoverMeeting: date('handover_meeting', { mode: 'string' }),
  transferDate: date('transfer_date', { mode: 'string' }),
  decidedBy: uuid('decided_by').notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0009. A non-blocking item missing at acceptance, with its deadline (SOP-DEL-01 §8). */
export const intakeCondition = pgTable('intake_condition', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  decisionId: uuid('decision_id').notNull(),
  itemCode: text('item_code').notNull(),
  text: text('text').notNull(),
  deadline: date('deadline', { mode: 'string' }).notNull(),
  status: text('status', { enum: ['open', 'met', 'expired'] })
    .notNull()
    .default('open'),
  metAt: timestamp('met_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0009. Delivery starts before acceptance, authorised in writing (SOP-DEL-01 §9). */
export const conditionalStart = pgTable('conditional_start', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  cardId: uuid('card_id').notNull(),
  authorisedBy: uuid('authorised_by').notNull(),
  missingItems: text('missing_items').array().notNull(),
  deadline: date('deadline', { mode: 'string' }).notNull(),
  writtenRef: text('written_ref').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0010. Restricted Internal Notes (group F): Sales owner, PM, director, sponsor only (D-28). */
export const restrictedNote = pgTable('restricted_note', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  itemCode: text('item_code'),
  body: text('body').notNull(),
  authorId: uuid('author_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0011. An action with an owner and a due date (E5 AC1, SOP-DEL-03). Archive, never delete. */
export const action = pgTable('action', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id'),
  title: text('title').notNull(),
  ownerId: uuid('owner_id'),
  ownerName: text('owner_name'),
  due: date('due', { mode: 'string' }).notNull(),
  status: text('status', { enum: ['open', 'in_progress', 'done', 'cancelled'] })
    .notNull()
    .default('open'),
  doneAt: timestamp('done_at', { withTimezone: true }),
  sourceKind: text('source_kind', {
    enum: ['manual', 'mail', 'dingtalk', 'meeting', 'visit', 'alert', 'comment'],
  }).notNull(),
  sourceRef: text('source_ref'),
  commentId: uuid('comment_id'),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0012. A comment or update on a project with @mentions (E5 AC2). Archive, never delete. */
export const comment = pgTable('comment', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id'),
  body: text('body').notNull(),
  mentions: uuid('mentions').array().notNull().default([]),
  authorId: uuid('author_id').notNull(),
  sourceKind: text('source_kind', { enum: ['manual', 'mail', 'dingtalk', 'meeting', 'visit', 'alert'] })
    .notNull()
    .default('manual'),
  sourceRef: text('source_ref'),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0013. Client data: RLS in the migration; archive, never delete. */
export const visit = pgTable('visit', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
