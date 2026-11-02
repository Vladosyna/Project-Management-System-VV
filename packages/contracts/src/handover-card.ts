// Handover Card — SOP-DEL-01 Annex B, sections 1–10 (Sales side). Section 11 (Intake Review) is written by
// Delivery: IntakeReview below. Data already on rows is not repeated here: Project ID, client, country and
// city come from the site; package, version and submission date from handover_card.
//
// This is the shape of a card at any stage, so every section and field is optional (a draft fills in
// over time). What a field holds is never blank: a value, or N/A with the reason (Annex B "How to fill",
// SOP-DEL-01 §6). Which fields a submission must have depends on the package (Full / Light) and is the
// §6 checklist rule in core/intake (E2.1c), not this schema. Objects are strict: unknown keys are refused,
// so nothing can be added to the card that the SOP keeps out of it (group F text, E2 AC7).
import { z } from 'zod';

const text = (max = 4000) => z.string().trim().min(1).max(max);
const name = text(200);

/** One card field: the answer, or N/A with the reason. A blank field returns the package (Annex B). */
export const HandoverField = z.union([z.strictObject({ value: text() }), z.strictObject({ na: text(500) })]);
export type HandoverField = z.infer<typeof HandoverField>;

/** "Nothing to list" is an answer, given explicitly; an empty list is not. */
const listOrNone = <T extends z.ZodType>(item: T) =>
  z.union([
    z.strictObject({ items: z.array(item).min(1).max(100) }),
    z.strictObject({ none: z.literal(true) }),
  ]);

export const projectTypes = [
  'new',
  'poc',
  'poc_to_rollout',
  'expansion',
  'add_points',
  'supply_only',
] as const;
export const stakeholderRoles = [
  'decision_maker',
  'project_owner',
  'day_to_day',
  'integrator_landlord',
  'incumbent_vendor',
  'vv_presales',
  'installer_partner',
] as const;

const Identification = z.strictObject({
  projectName: name,
  clientLegalEntity: name,
  siteAddresses: text(),
  projectType: z.enum(projectTypes),
  salesOwnerId: z.uuid(),
  /** Folder standard + client pack (SOP-DEL-01 §3.1): same letter per site; Mixed → per site in the Site Register. */
  folderPack: z.enum(['L', 'S', 'mixed']),
  oaRef: HandoverField,
  folderLink: HandoverField,
});

const Commercial = z.strictObject({
  governingContract: HandoverField, // A1
  otherContracts: HandoverField, // A1
  scopeOfSupply: HandoverField, // A2
  servicesIncluded: HandoverField, // A2
  costSplit: HandoverField, // A3
  committedDates: HandoverField, // A4
  penaltyClauses: HandoverField, // A4
  warrantySupport: HandoverField, // A5
  acceptanceCriteria: HandoverField, // A6
  paymentMilestones: HandoverField, // A7
  exclusions: HandoverField, // A8
});

/** B1–B4: relationship level only, business contact details only. Site contacts are in the CIP card. */
const Stakeholder = z.strictObject({
  role: z.enum(stakeholderRoles),
  name,
  title: text(200).optional(),
  email: z.email().max(254).optional(),
  phone: text(50).optional(),
  language: text(50).optional(),
  canApprove: text(500).optional(),
});

const SiteInformationCard = z.strictObject({
  packSent: z
    .array(z.enum(['CIP-L', 'CIP-S']))
    .min(1)
    .max(2),
  sentOn: z.iso.date(),
  cardsReturned: text(),
  returnedOn: z.iso.date(),
  sitesCovered: z.enum(['all', 'first_wave']),
  attached: z.array(z.enum(['card', 'drawings', 'photos', 'kpi_list', 'network_requirements'])).max(5),
  completenessCheck: text(),
  checkedById: z.uuid(),
  checkedOn: z.iso.date(),
  notCovered: HandoverField, // C2 · D3
});

const Gap = z.strictObject({ item: text(500), rdOwner: name, date: z.iso.date() });

const Technical = z.strictObject({
  sitesAndPoints: HandoverField, // C1
  pointDesign: HandoverField, // C3
  platform: HandoverField, // C4
  securityPrivacy: HandoverField, // C5
  pocResults: HandoverField, // C6
  gapList: listOrNone(Gap), // D1
  promisedCustomisations: HandoverField, // D2
});

const Communication = z.strictObject({
  languageChannel: HandoverField, // E1
  contactHours: HandoverField, // E2
  ccRules: HandoverField, // E3
  sensitivities: HandoverField, // E4
  escalationRhythm: HandoverField, // E5
  keyCorrespondence: HandoverField, // E6
});

/** Section 7: only whether items were recorded in the restricted Internal Notes — never their text (AC7). */
const Internal = z.strictObject({
  verbalCommitments: z.union([
    z.strictObject({ recorded: z.int().min(1).max(999) }),
    z.strictObject({ none: z.literal(true) }),
  ]), // F1
  concessions: z.enum(['recorded', 'none']), // F2
  relationshipMap: z.union([
    z.strictObject({ recorded: z.literal(true) }),
    z.strictObject({ na: text(500) }),
  ]), // F3–F4
  relationshipHealth: z.strictObject({ level: z.enum(['green', 'amber', 'red']), reason: text(300) }), // F5
});

const OpenItem = z.strictObject({ question: text(1000), ownerId: z.uuid(), due: z.iso.date() });

const ChangeLogEntry = z.strictObject({
  date: z.iso.date(),
  change: text(),
  agreedBy: name,
  pmFeasibilityConfirmed: z.boolean(),
});

/** Section 10: set by the sign commands from the signed-in user, never typed. */
const Signature = z.strictObject({ signedById: z.uuid(), signedAt: z.iso.datetime({ offset: true }) });

export const HandoverCardContent = z.strictObject({
  identification: Identification.partial().optional(), // 1
  commercial: Commercial.partial().optional(), // 2 · A
  stakeholders: z.array(Stakeholder).max(50).optional(), // 3 · B
  siteInformationCard: SiteInformationCard.partial().optional(), // 4 · C2
  technical: Technical.partial().optional(), // 5 · C, D
  communication: Communication.partial().optional(), // 6 · E
  internal: Internal.partial().optional(), // 7 · F
  openItems: listOrNone(OpenItem).optional(), // 8 · G1
  changeLog: z.array(ChangeLogEntry).max(500).optional(), // 9, after transfer
  salesDeclaration: z.strictObject({ salesOwner: Signature, salesLead: Signature.optional() }).optional(), // 10
});
export type HandoverCardContent = z.infer<typeof HandoverCardContent>;

export const intakeDecisions = ['accepted', 'accepted_with_conditions', 'returned'] as const;

/** Section 11 — Delivery use only (SOP-DEL-01 §8). Which items may be conditions is the rule in core/intake. */
export const IntakeReview = z.strictObject({
  decision: z.enum(intakeDecisions),
  folderStandard: z.enum(['L', 'S', 'mixed']),
  conditions: z
    .array(
      z.strictObject({
        itemCode: z.string().regex(/^[A-G][1-9]$/),
        text: text(1000),
        deadline: z.iso.date(),
      }),
    )
    .max(50),
  reasons: text().optional(),
  assignedPmId: z.uuid().optional(),
  handoverMeeting: z.iso.date().optional(),
  transferDate: z.iso.date().optional(),
});
export type IntakeReview = z.infer<typeof IntakeReview>;
