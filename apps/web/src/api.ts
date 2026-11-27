// Calls to the OCS API. Shapes come from the API; only what the screens need is typed here.
export interface Me {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly mfaEnabled: boolean;
}

export type Session = { state: 'signed-in'; me: Me } | { state: 'signed-out' } | { state: 'mfa-required' };

export async function loadSession(): Promise<Session> {
  const res = await fetch('/api/me', { credentials: 'same-origin' });
  if (res.status === 401) return { state: 'signed-out' };
  if (res.status === 403) {
    const body = (await res.json()) as { error?: string };
    if (body.error === 'mfa_required') return { state: 'mfa-required' };
  }
  if (!res.ok) throw new Error(`GET /api/me → ${String(res.status)}`);
  return { state: 'signed-in', me: (await res.json()) as Me };
}

/** Accepts an invitation; the response sets the session cookie. */
export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
}): Promise<boolean> {
  const res = await fetch('/api/invitations/accept', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export interface ClientSummary {
  readonly id: string;
  readonly shortCode: string;
  readonly name: string;
}

export interface SiteSummary {
  readonly id: string;
  readonly clientId: string;
  readonly projectId: string;
  readonly name: string;
  readonly cityName: string;
  readonly standard: 'L' | 'S';
  /** Staff only (E4): the mall on the device platform and the offline alerts checkbox. */
  readonly platformRef?: string | null;
  readonly deviceAlertsEnabled?: boolean;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`GET ${path} → ${String(res.status)}`);
  return (await res.json()) as T;
}

/** Clients and their sites, as far as the signed-in user may see them. */
export async function loadPortfolio(): Promise<{ clients: ClientSummary[]; sites: SiteSummary[] }> {
  const [clients, sites] = await Promise.all([
    getJson<ClientSummary[]>('/api/clients'),
    getJson<SiteSummary[]>('/api/sites'),
  ]);
  return { clients, sites };
}

export interface OpenAction {
  readonly id: string;
  readonly projectId: string | null;
  readonly title: string;
  readonly owner: { readonly userId: string; readonly name: string | null } | { readonly name: string };
  readonly due: string;
  readonly overdue: boolean;
  readonly status: 'open' | 'in_progress';
  readonly source: { readonly kind: string; readonly ref: string | null };
}

/** Open actions the signed-in user may see; `mine` keeps only their own. */
export async function loadActions(mine: boolean): Promise<OpenAction[]> {
  return getJson<OpenAction[]>(`/api/actions${mine ? '?mine=true' : ''}`);
}

/** Open actions of one project. */
export async function loadSiteActions(siteId: string): Promise<OpenAction[]> {
  return getJson<OpenAction[]>(`/api/actions?siteId=${encodeURIComponent(siteId)}`);
}

export interface FeedItem {
  readonly kind: 'action' | 'comment' | 'visit';
  readonly id: string;
  readonly at: string;
  readonly text: string;
  readonly source: { readonly kind: string; readonly ref: string | null };
  readonly detail: Readonly<Record<string, string | number | boolean | null>>;
}

/** One project: its row, its client and its feed (newest first). */
export async function loadSite(
  siteId: string,
): Promise<{ site: SiteSummary; client: ClientSummary | undefined; feed: FeedItem[] } | undefined> {
  const [{ clients, sites }, feed] = await Promise.all([
    loadPortfolio(),
    getJson<FeedItem[]>(`/api/sites/${encodeURIComponent(siteId)}/feed`),
  ]);
  const site = sites.find((s) => s.id === siteId);
  return site ? { site, client: clients.find((c) => c.id === site.clientId), feed } : undefined;
}

export interface StaffMember {
  readonly id: string;
  readonly name: string;
}

export async function loadStaff(): Promise<StaffMember[]> {
  return getJson<StaffMember[]>('/api/staff');
}

/** Adds a comment to a project, @mentioning these staff members. 'forbidden' when the user may not comment. */
export async function addComment(
  siteId: string,
  body: string,
  mentions: readonly string[],
): Promise<'ok' | 'forbidden'> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/comments`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body, mentions }),
  });
  if (res.status === 403) return 'forbidden';
  if (!res.ok) throw new Error(`POST comment → ${String(res.status)}`);
  return 'ok';
}

export type ActionOwner = { readonly userId: string } | { readonly name: string };

/** Turns a comment into an action. 'forbidden' when the user's role may not. */
export async function commentToAction(
  commentId: string,
  owner: ActionOwner,
  due: string,
): Promise<'ok' | 'forbidden'> {
  const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/action`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ owner, due }),
  });
  if (res.status === 403) return 'forbidden';
  if (!res.ok) throw new Error(`POST action → ${String(res.status)}`);
  return 'ok';
}

export interface VisitInput {
  readonly type: string;
  readonly visitDate: string;
  readonly attendees: readonly { readonly name: string; readonly side: string }[];
  readonly summary: string;
  readonly decided: readonly { readonly text: string; readonly agreedWith: string }[];
  readonly discussed: readonly string[];
  readonly coverage: { readonly done: number; readonly total: number; readonly gap?: string };
  readonly actions: readonly { readonly title: string; readonly owner: ActionOwner; readonly due: string }[];
  readonly escalate: boolean;
  readonly minutesRef?: string;
}

/** Records a site visit with its action items. 'rejected' when the record breaks a rule or the role may not. */
export async function recordVisit(siteId: string, input: VisitInput): Promise<'ok' | 'rejected'> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/visits`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if ([400, 403, 422].includes(res.status)) return 'rejected';
  if (!res.ok) throw new Error(`POST visit → ${String(res.status)}`);
  return 'ok';
}

/** E4: link a project to its mall and switch its offline alerts. Conflict: the mall is linked elsewhere. */
export async function saveDeviceAlerts(
  siteId: string,
  platformRef: string | null,
  alertsEnabled: boolean,
): Promise<'ok' | 'forbidden' | 'conflict' | 'needsMall'> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/device-alerts`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ platformRef, alertsEnabled }),
  });
  if (res.status === 403) return 'forbidden';
  if (res.status === 409) return 'conflict';
  if (res.status === 422) return 'needsMall';
  if (!res.ok) throw new Error(`PUT device-alerts → ${String(res.status)}`);
  return 'ok';
}

export interface SiteDevice {
  readonly id: string;
  readonly sn: string;
  readonly model: string;
  readonly ip: string | null;
  readonly switchName: string | null;
  readonly switchPort: string | null;
  readonly firmware: string | null;
  readonly algorithmVersion: string | null;
  readonly firmwareIssues: readonly {
    readonly id: string;
    readonly summary: string;
    readonly severity: 'info' | 'degraded' | 'critical';
    readonly source: string | null;
  }[];
  readonly platformStatus: 'online' | 'offline' | 'disabled' | null;
  readonly offlineSince: string | null;
  readonly registered: boolean;
  readonly channels: readonly { readonly no: number; readonly gate: string | null }[];
}

/** E4: a project's devices; undefined when the user may not see them. */
export async function loadSiteDevices(siteId: string): Promise<SiteDevice[] | undefined> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/devices`, { credentials: 'same-origin' });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET devices → ${String(res.status)}`);
  return (await res.json()) as SiteDevice[];
}

type WriteOutcome = 'ok' | 'forbidden' | 'invalid';

async function send(method: string, path: string, body: unknown): Promise<WriteOutcome> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return 'forbidden';
  if (res.status === 400 || res.status === 404) return 'invalid';
  if (!res.ok) throw new Error(`${method} ${path} → ${String(res.status)}`);
  return 'ok';
}

export interface CommercialRecord {
  readonly id: string;
  readonly kind: 'client_po' | 'dpia' | 'client_invoice' | 'price_list';
  readonly reference: string | null;
  readonly status: string;
  readonly recordDate: string;
  readonly money: { amount: string; currency: string; eur: string; fxRate: string; fxDate: string } | null;
  readonly proposedVia: 'web' | 'ai';
  readonly confirmed: boolean;
}

/** E13: a site's commercial records; undefined when the role may not see them. */
export async function loadCommercial(siteId: string): Promise<CommercialRecord[] | undefined> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/commercial`, {
    credentials: 'same-origin',
  });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET commercial → ${String(res.status)}`);
  return (await res.json()) as CommercialRecord[];
}

export interface CommercialPortfolioRow {
  readonly siteId: string;
  readonly projectId: string;
  readonly poCount: number;
  readonly poEur: string;
  readonly invoicedEur: string;
  readonly paidEur: string;
  readonly dpia: string | null;
  readonly priceEur: string | null;
  readonly proposals: number;
}

/** E13 overview: commercial status of every site the user may see; undefined when the role may not. */
export async function loadCommercialPortfolio(): Promise<CommercialPortfolioRow[] | undefined> {
  const res = await fetch('/api/commercial', { credentials: 'same-origin' });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET commercial → ${String(res.status)}`);
  return (await res.json()) as CommercialPortfolioRow[];
}

export function addCommercial(siteId: string, input: Record<string, unknown>): Promise<WriteOutcome> {
  return send('POST', `/api/sites/${encodeURIComponent(siteId)}/commercial`, input);
}

export function confirmCommercial(recordId: string): Promise<WriteOutcome> {
  return send('POST', `/api/commercial/${encodeURIComponent(recordId)}/confirm`, {});
}

export function archiveCommercial(recordId: string, reason: string): Promise<WriteOutcome> {
  return send('POST', `/api/commercial/${encodeURIComponent(recordId)}/archive`, { reason });
}

export interface InstallerQuote {
  readonly id: string;
  readonly installer: string;
  readonly amount: string;
  readonly currency: string;
  readonly eur: string;
  readonly validUntil: string | null;
  readonly confirmed: boolean;
}
export interface InstallerJob {
  readonly id: string;
  readonly installer: string | null;
  readonly scope: 'partial' | 'full';
  readonly sensorCount: number;
  readonly sowVersion: string | null;
  readonly scheduledOn: string | null;
  readonly status: string;
  readonly quotes: readonly InstallerQuote[];
}

/** E12: a site's installer jobs with their quotes, cheapest first in EUR; undefined when the role may not see them. */
export async function loadInstallerJobs(siteId: string): Promise<InstallerJob[] | undefined> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/installer-jobs`, {
    credentials: 'same-origin',
  });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET installer-jobs → ${String(res.status)}`);
  return (await res.json()) as InstallerJob[];
}

/** E12 writes: 'rule' = refused by a supplier rule (P-12) or the status order (422), 'conflict' = already done. */
export async function installerWrite(
  path: string,
  body: Record<string, unknown>,
): Promise<'ok' | 'forbidden' | 'invalid' | 'rule' | 'conflict'> {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return 'forbidden';
  if (res.status === 422) return 'rule';
  if (res.status === 409) return 'conflict';
  if (res.status === 400 || res.status === 404) return 'invalid';
  if (!res.ok) throw new Error(`POST ${path} → ${String(res.status)}`);
  return 'ok';
}

/** D-36: a task in a project for one staff member, with a due date. */
export function createSiteAction(
  siteId: string,
  input: { title: string; owner: { userId: string }; due: string },
): Promise<WriteOutcome> {
  return send('POST', `/api/sites/${encodeURIComponent(siteId)}/actions`, input);
}

/** D-36: mark an action done — its owner, or a director or PM. */
export function completeActionOf(actionId: string): Promise<WriteOutcome> {
  return send('POST', `/api/actions/${encodeURIComponent(actionId)}/complete`, {});
}

/** D-31: firmware and/or algorithm version on devices of a project. */
export function saveVersions(
  siteId: string,
  input: { deviceIds: readonly string[]; firmware?: string; algorithmVersion?: string },
): Promise<WriteOutcome> {
  return send('POST', `/api/sites/${encodeURIComponent(siteId)}/devices/versions`, input);
}

/** D-31: a known problem of one firmware of one model (R&D). */
export function saveFirmwareIssue(input: {
  model: string;
  firmware: string;
  summary: string;
  severity: 'info' | 'degraded' | 'critical';
  source?: string;
}): Promise<WriteOutcome> {
  return send('POST', '/api/firmware-issues', input);
}

/** E4 AC1 / D-29: register a device by SN (fallback to the platform sync). R6 refuses a duplicate SN (422). */
export async function registerSiteDevice(
  siteId: string,
  input: { sn: string; model: string },
): Promise<WriteOutcome | 'duplicate'> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/devices`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.status === 403) return 'forbidden';
  if (res.status === 422) return 'duplicate';
  if (res.status === 400 || res.status === 404) return 'invalid';
  if (!res.ok) throw new Error(`POST device → ${String(res.status)}`);
  return 'ok';
}

export interface SiteLifecycle {
  readonly stage: string | null;
  readonly steps: readonly {
    readonly id: string;
    readonly step: string;
    readonly doneOn: string;
    readonly evidence: string | null;
    readonly note: string | null;
  }[];
  readonly baseSteps: readonly string[];
  readonly template: { readonly id: string; readonly name: string } | null;
  readonly gates: readonly {
    readonly key: string;
    readonly name: string;
    readonly status: 'passed' | 'current' | 'not_started';
    readonly doneOn: string | null;
  }[];
  readonly plannedInstallationDate: string | null;
  readonly workingDaysToInstallation: number | null;
  readonly readinessAtRisk: boolean;
}

export async function loadLifecycle(siteId: string): Promise<SiteLifecycle | undefined> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/lifecycle`, {
    credentials: 'same-origin',
  });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET lifecycle → ${String(res.status)}`);
  return (await res.json()) as SiteLifecycle;
}

/** 'rule': refused by SOP-DEL-04 / E3 (order, evidence, card first); 'conflict': already recorded. */
export async function writeLifecycle(
  method: 'POST' | 'PUT',
  siteId: string,
  path: 'steps' | 'installation',
  body: Record<string, string>,
): Promise<'ok' | 'forbidden' | 'rule' | 'conflict' | 'invalid'> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return 'forbidden';
  if (res.status === 422) return 'rule';
  if (res.status === 409) return 'conflict';
  if (res.status === 400 || res.status === 404) return 'invalid';
  if (!res.ok) throw new Error(`${method} ${path} → ${String(res.status)}`);
  return 'ok';
}

export interface GateTemplate {
  readonly id: string;
  readonly clientId: string | null;
  readonly programmeId: string | null;
  readonly countryCode: string | null;
  readonly name: string;
  readonly gates: readonly { readonly key: string; readonly name: string; readonly readinessDays?: number }[];
  readonly since: string;
}

/** D-32: active gate templates; undefined when the role may not see them. */
export async function loadGateTemplates(): Promise<GateTemplate[] | undefined> {
  const res = await fetch('/api/gate-templates', { credentials: 'same-origin' });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET gate-templates → ${String(res.status)}`);
  return (await res.json()) as GateTemplate[];
}

/** D-32: save the gates of a scope (replaces its active template) — director or above. */
export function saveGateTemplateOf(input: {
  clientId: string | null;
  countryCode: string | null;
  name: string;
  gates: readonly { key: string; name: string; readinessDays?: number }[];
}): Promise<WriteOutcome> {
  return send('POST', '/api/gate-templates', input);
}

export function archiveGateTemplateOf(id: string): Promise<WriteOutcome> {
  return send('POST', `/api/gate-templates/${encodeURIComponent(id)}/archive`, {});
}

export type CardStatus = 'draft' | 'submitted' | 'accepted' | 'accepted_with_conditions' | 'returned';
export interface HandoverCardView {
  readonly id: string;
  readonly version: number;
  readonly status: CardStatus;
  readonly package: 'full' | 'light';
  readonly content: { identification?: { projectName?: string; projectType?: string } };
  readonly items: readonly {
    readonly code: string;
    readonly status: 'provided' | 'na';
    readonly value: string | null;
    readonly naReason: string | null;
  }[];
  readonly gaps: readonly { readonly code: string; readonly blocking: boolean }[];
  readonly decision: {
    readonly decision: string;
    readonly reasons: string | null;
    readonly conditions: readonly { itemCode: string; text: string; deadline: string; status: string }[];
  } | null;
  readonly conditionalStart: { missingItems: string[]; deadline: string; writtenRef: string } | null;
  /** SOP-DEL-01 §9: the latest dispute of a return on this project; outcome null while open. */
  readonly dispute: {
    readonly reason: string;
    readonly dueOn: string;
    readonly outcome: 'upheld' | 'overturned' | null;
    readonly note: string | null;
  } | null;
}

/** E2: the project's latest Handover Card; null before one exists; undefined when the role may not see it. */
export async function loadHandoverCard(siteId: string): Promise<HandoverCardView | null | undefined> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/handover-card`, {
    credentials: 'same-origin',
  });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET handover-card → ${String(res.status)}`);
  return (await res.json()) as HandoverCardView | null;
}

/** E2 writes on a project: 'rule' = refused by the SOP (422), 'conflict' = under review (409). */
export async function intakeWrite(
  siteId: string,
  path:
    | 'handover-card'
    | 'handover-card/submit'
    | 'intake-decision'
    | 'conditional-start'
    | 'intake-dispute'
    | 'intake-dispute/decide',
  body: Record<string, unknown>,
): Promise<'ok' | 'forbidden' | 'invalid' | 'rule' | 'conflict'> {
  const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return 'forbidden';
  if (res.status === 422) return 'rule';
  if (res.status === 409) return 'conflict';
  if (res.status === 400 || res.status === 404) return 'invalid';
  if (!res.ok) throw new Error(`POST ${path} → ${String(res.status)}`);
  return 'ok';
}

export interface IntakeRegisterRow {
  readonly projectId: string;
  readonly version: number;
  readonly submittedOn: string;
  readonly decision: 'pending' | 'accepted' | 'accepted_with_conditions' | 'returned';
  readonly decidedOn: string | null;
  readonly returns: number;
  readonly daysToAcceptance: number | null;
}

/** E2 AC6: the Intake Register, optionally one month of submissions; undefined when the role may not see it. */
export async function loadIntakeRegister(month: string): Promise<IntakeRegisterRow[] | undefined> {
  const res = await fetch(`/api/intake-register${month ? `?month=${encodeURIComponent(month)}` : ''}`, {
    credentials: 'same-origin',
  });
  if (res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET intake-register → ${String(res.status)}`);
  return (await res.json()) as IntakeRegisterRow[];
}

export interface ConnectedAgent {
  readonly clientId: string;
  readonly name: string | null;
  readonly since: string | null;
}

/** D-33: the AI agents the signed-in person connected to OCS. */
export function loadAgents(): Promise<ConnectedAgent[]> {
  return getJson<ConnectedAgent[]>('/api/agents');
}

/** D-33: disconnect an agent — its tokens stop working at once. */
export function revokeAgentAccess(clientId: string): Promise<WriteOutcome> {
  return send('POST', `/api/agents/${encodeURIComponent(clientId)}/revoke`, {});
}
