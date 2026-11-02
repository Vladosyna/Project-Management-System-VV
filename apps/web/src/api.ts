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
