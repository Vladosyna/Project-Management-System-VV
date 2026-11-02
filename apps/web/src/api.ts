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
