// Drizzle table definitions. Source of truth for the database is migrations/*.sql;
// schema-drift.int.test.ts fails when these definitions and the migrated database disagree.
import {
  boolean,
  date,
  inet,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
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
  /** D-45 (0027): DPIA and LPA agreed per store or once per country. */
  complianceScope: text('compliance_scope', { enum: ['site', 'country'] })
    .notNull()
    .default('site'),
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
  /** Migration 0015: the mall on the device platform (plazaUnid). */
  platformRef: text('platform_ref'),
  /** Migration 0015: offline alerts on or off for this project (checkbox, off by default). */
  deviceAlertsEnabled: boolean('device_alerts_enabled').notNull().default(false),
  /** Migration 0018 (E3): the client's gate template for this project, and the planned installation date. */
  gateTemplateId: uuid('gate_template_id'),
  plannedInstallationDate: date('planned_installation_date'),
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
/** Device platform status (07-integrations: 0 offline, 1 online, 3 disabled); migration 0015 CHECK. */
export const DEVICE_PLATFORM_STATUSES = ['online', 'offline', 'disabled'] as const;

export const device = pgTable('device', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  sn: text('sn').notNull(),
  mac: text('mac'),
  model: text('model').notNull(),
  firmware: text('firmware'),
  /** Migration 0017 (D-31): by hand now, from the device platform later. */
  algorithmVersion: text('algorithm_version'),
  switchName: text('switch_name'),
  switchPort: text('switch_port'),
  ip: inet('ip'),
  status: text('status', { enum: DEVICE_STATUSES }).notNull().default('planned'),
  replacedById: uuid('replaced_by_id'),
  /** Migration 0015: what the device platform last said; separate from the delivery life cycle. */
  platformStatus: text('platform_status', { enum: DEVICE_PLATFORM_STATUSES }),
  /** Migration 0015: when OCS first saw it offline (set only while offline; R15 measures from it). */
  offlineSince: timestamp('offline_since', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  /** Migration 0016: when registered in OCS by SN (manual or import); null: only from the platform so far. */
  registeredAt: timestamp('registered_at', { withTimezone: true }),
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
  visitId: uuid('visit_id'),
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

/** Visit types of SOP-DEL-03 §2; the CHECK in migration 0013 lists the same values. */
export const VISIT_TYPES = [
  'site_survey',
  'technical_inspection',
  'installation',
  'commissioning',
  'maintenance',
] as const;

/** Migration 0013. Same-day internal record of a site visit (SOP-DEL-03 §5.1). Archive, never delete. */
export const visit = pgTable('visit', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  type: text('type', { enum: VISIT_TYPES }).notNull(),
  visitDate: date('visit_date', { mode: 'string' }).notNull(),
  attendees: jsonb('attendees').$type<{ name: string; side: 'vv' | 'client' | 'third_party' }[]>().notNull(),
  summary: text('summary').notNull(),
  decided: jsonb('decided').$type<{ text: string; agreedWith: string }[]>().notNull().default([]),
  discussed: jsonb('discussed').$type<string[]>().notNull().default([]),
  keyPoints: text('key_points'),
  coverageDone: integer('coverage_done').notNull(),
  coverageTotal: integer('coverage_total').notNull(),
  coverageGap: text('coverage_gap'),
  followUp: text('follow_up'),
  escalate: boolean('escalate').notNull().default(false),
  minutesRef: text('minutes_ref'),
  svrNo: integer('svr_no'),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  recordedBy: uuid('recorded_by').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0015. A mall's areas (stores) and gates, as on the device platform. Archive, never delete. */
export const zone = pgTable('zone', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  kind: text('kind', { enum: ['area', 'gate'] }).notNull(),
  platformRef: text('platform_ref').notNull(),
  name: text('name').notNull(),
  entrance: boolean('entrance').notNull().default(false),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0015. Which gate each channel of a device counts. Internal only; updated in place, never deleted. */
export const deviceChannel = pgTable(
  'device_channel',
  {
    deviceId: uuid('device_id').notNull(),
    channelNo: integer('channel_no').notNull(),
    clientId: uuid('client_id').notNull(),
    siteId: uuid('site_id').notNull(),
    zoneId: uuid('zone_id'),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.channelNo] })],
);

/** Migration 0017 (D-31). Known problems of a firmware version of a model; R&D reference data, staff only. */
export const firmwareIssue = pgTable('firmware_issue', {
  id: uuid('id').primaryKey(),
  model: text('model').notNull(),
  firmware: text('firmware').notNull(),
  summary: text('summary').notNull(),
  severity: text('severity', { enum: ['info', 'degraded', 'critical'] }).notNull(),
  source: text('source'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0018 (E3, SOP-DEL-04). A client's gates in order; internal configuration. */
export const gateTemplate = pgTable('gate_template', {
  id: uuid('id').primaryKey(),
  /** Migration 0019: scope — null client is the base template; country narrows a client or programme. */
  clientId: uuid('client_id'),
  programmeId: uuid('programme_id'),
  countryCode: text('country_code'),
  updatedBy: uuid('updated_by'),
  name: text('name').notNull(),
  gates: jsonb('gates')
    .$type<{ key: string; name: string; order: number; readinessDays?: number }[]>()
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0018 (E3). A step reached on a project: base step or gate key; never edited, only archived. */
export const siteStep = pgTable('site_step', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  step: text('step').notNull(),
  doneOn: date('done_on').notNull(),
  actorId: uuid('actor_id').notNull(),
  evidence: text('evidence'),
  note: text('note'),
  visibility: text('visibility', { enum: ['internal', 'client'] })
    .notNull()
    .default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** Migration 0021. Client data: RLS in the migration; archive, never delete. */
export const intakeDispute = pgTable('intake_dispute', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  decisionId: uuid('decision_id').notNull().unique(),
  reason: text('reason').notNull(),
  raisedBy: uuid('raised_by').notNull(),
  raisedAt: timestamp('raised_at', { withTimezone: true }).notNull().defaultNow(),
  dueOn: date('due_on', { mode: 'string' }).notNull(),
  outcome: text('outcome', { enum: ['upheld', 'overturned'] }),
  outcomeNote: text('outcome_note'),
  decidedBy: uuid('decided_by'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-34 N2: commercial status per site (0022). Money in the original currency and in EUR with the rate used. */
/** D-45: the part of the work a PO, invoice or quotation covers. */
export const RECORD_PARTS = ['all', 'hardware', 'installation'] as const;
export const COMMERCIAL_KINDS = ['client_po', 'dpia', 'client_invoice', 'price_list'] as const;
export const commercialRecord = pgTable('commercial_record', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  kind: text('kind', { enum: COMMERCIAL_KINDS }).notNull(),
  /** D-45 (0027): all of the work, or hardware / installation only. */
  part: text('part', { enum: RECORD_PARTS }).notNull().default('all'),
  reference: text('reference'),
  status: text('status').notNull(),
  recordDate: date('record_date', { mode: 'string' }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }),
  currency: text('currency'),
  eurAmount: numeric('eur_amount', { precision: 14, scale: 2 }),
  fxRate: numeric('fx_rate', { precision: 14, scale: 6 }),
  fxDate: date('fx_date', { mode: 'string' }),
  fxSource: text('fx_source', { enum: ['manual', 'agent', 'ecb'] }),
  sourceRef: text('source_ref'),
  proposedBy: uuid('proposed_by').notNull(),
  proposedVia: text('proposed_via', { enum: ['web', 'ai'] }).notNull(),
  confirmedBy: uuid('confirmed_by'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-44 (0026): further stores a commercial record (a batch PO) covers, besides commercialRecord.siteId. */
export const commercialRecordSite = pgTable('commercial_record_site_link', {
  recordId: uuid('record_id').notNull(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-34 N1 (0023): an installer job per site or trip. Internal only. */
export const INSTALLER_JOB_STATUSES = [
  'planned',
  'quoting',
  'approved',
  'scheduled',
  'done',
  'attended_not_ready',
  'cancelled',
] as const;
export const installerJob = pgTable('installer_job', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  partnerId: uuid('partner_id'),
  scope: text('scope', { enum: ['partial', 'full'] }).notNull(),
  sensorCount: integer('sensor_count').notNull(),
  sowVersion: text('sow_version'),
  sowSentOn: date('sow_sent_on', { mode: 'string' }),
  scheduledOn: date('scheduled_on', { mode: 'string' }),
  status: text('status', { enum: INSTALLER_JOB_STATUSES }).notNull().default('planned'),
  outcomeNote: text('outcome_note'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-34 N1 (0023): an installer's quote for a job; original currency + EUR; AI proposals wait for confirmation. */
export const priceProposal = pgTable('price_proposal', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  jobId: uuid('job_id').notNull(),
  partnerId: uuid('partner_id').notNull(),
  sowVersion: text('sow_version'),
  lines: jsonb('lines').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  eurAmount: numeric('eur_amount', { precision: 14, scale: 2 }).notNull(),
  fxRate: numeric('fx_rate', { precision: 14, scale: 6 }).notNull(),
  fxDate: date('fx_date', { mode: 'string' }).notNull(),
  fxSource: text('fx_source', { enum: ['manual', 'agent', 'ecb'] }).notNull(),
  validUntil: date('valid_until', { mode: 'string' }),
  sourceKind: text('source_kind', { enum: ['mail', 'pdf', 'xlsx', 'whatsapp', 'manual'] }).notNull(),
  sourceRef: text('source_ref'),
  proposedBy: uuid('proposed_by').notNull(),
  proposedVia: text('proposed_via', { enum: ['web', 'ai'] }).notNull(),
  confirmedBy: uuid('confirmed_by'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-34 N1 (0023): the CEO's approval of a job's chosen quote (P-11), recorded by a person; one active per job. */
export const quoteApproval = pgTable('quote_approval', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  jobId: uuid('job_id').notNull(),
  proposalId: uuid('proposal_id').notNull(),
  approvalRef: text('approval_ref').notNull(),
  approvedOn: date('approved_on', { mode: 'string' }).notNull(),
  singleQuoteReason: text('single_quote_reason'),
  recordedBy: uuid('recorded_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-40 (0024): client quotation settings per client × country; entered by a director. Internal only. */
export const clientQuoteConfig = pgTable('client_quote_config', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  countryCode: text('country_code').notNull(),
  currency: text('currency').notNull(),
  hourlyRate: numeric('hourly_rate', { precision: 14, scale: 2 }).notNull(),
  taxMode: text('tax_mode', { enum: ['reverse_charge', 'ddp_local_vat'] }).notNull(),
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }),
  seller: jsonb('seller').notNull(),
  buyer: jsonb('buyer').notNull(),
  bank: jsonb('bank').notNull(),
  terms: jsonb('terms').notNull(),
  numberPrefix: text('number_prefix').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-40 (0024): a sensor model's price for a client. */
export const sensorPrice = pgTable('sensor_price', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  model: text('model').notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-40 (0024): a client quotation drafted by OCS; a person sends it and records that. */
export const clientQuotation = pgTable('client_quotation', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  /** D-45 (0027): all of the work, or hardware / installation only. */
  part: text('part', { enum: RECORD_PARTS }).notNull().default('all'),
  configId: uuid('config_id').notNull(),
  number: text('number').notNull().unique(),
  title: text('title').notNull(),
  issueDate: date('issue_date', { mode: 'string' }).notNull(),
  lines: jsonb('lines').notNull(),
  standardHours: numeric('standard_hours', { precision: 8, scale: 1 }).notNull(),
  quotedHours: numeric('quoted_hours', { precision: 8, scale: 1 }).notNull(),
  hoursReason: text('hours_reason'),
  currency: text('currency').notNull(),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  taxMode: text('tax_mode', { enum: ['reverse_charge', 'ddp_local_vat'] }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 14, scale: 2 }).notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
  status: text('status', { enum: ['draft', 'sent'] })
    .notNull()
    .default('draft'),
  sentBy: uuid('sent_by'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-40 (0024): the stores a quotation covers, with sensors and scope for the time standard. */
export const clientQuotationSite = pgTable(
  'client_quotation_site',
  {
    quotationId: uuid('quotation_id').notNull(),
    clientId: uuid('client_id').notNull(),
    siteId: uuid('site_id').notNull(),
    sensorCount: integer('sensor_count').notNull(),
    scope: text('scope', { enum: ['partial', 'full'] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.quotationId, t.siteId] })],
);

/** D-43 (0025): a store's planned devices from the proposal (model × count), versioned; one active per store. */
export const siteProposal = pgTable('site_proposal', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  siteId: uuid('site_id').notNull(),
  version: integer('version').notNull(),
  items: jsonb('items').notNull(),
  proposalRef: text('proposal_ref').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/** D-45 (0027): a DPIA or LPA approved once for a client's country; covers every store there. Internal only. */
export const countryCompliance = pgTable('country_compliance', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id').notNull(),
  countryCode: text('country_code').notNull(),
  kind: text('kind', { enum: ['dpia', 'lpa'] }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull(),
  reference: text('reference'),
  recordDate: date('record_date', { mode: 'string' }).notNull(),
  sourceRef: text('source_ref'),
  proposedBy: uuid('proposed_by').notNull(),
  proposedVia: text('proposed_via', { enum: ['web', 'ai'] }).notNull(),
  confirmedBy: uuid('confirmed_by'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
