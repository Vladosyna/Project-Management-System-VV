// F0.8 acceptance end to end over HTTP against PostgreSQL: invitation only, password, mandatory TOTP,
// sessions, roles → permissions, audit. (Passkey ceremonies need a browser: covered by the e2e suite, F0.9.)
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { URI, type TOTP } from 'otpauth';
import { systemActor } from '@ocs/core/kernel';
import { bootstrapAdmin } from '@ocs/core/identity';
import { createRuntime, migrateDatabase, type Runtime } from '@ocs/core/runtime';
import { countRows, createTestDatabase, runAsOwner, type TestDatabase } from '@ocs/testing';
import { createApp } from '../app.ts';

const ORIGIN = 'http://localhost:3000';
const ADMIN = { email: 'person01@example.test', name: 'Person 01', password: 'correct horse battery staple' };
const PM = { email: 'person02@example.test', name: 'Person 02', password: 'another long passphrase' };

let testDb: TestDatabase;
let rt: Runtime;
let app: ReturnType<typeof createApp>;

/** A tiny browser: keeps cookies between requests and sends the Origin header better-auth checks. */
class Browser {
  private cookies = new Map<string, string>();
  async request(method: string, path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
    const headers = new Headers({ origin: ORIGIN });
    if (this.cookies.size > 0) {
      headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    }
    if (body !== undefined) headers.set('content-type', 'application/json');
    const res = await app.request(`${ORIGIN}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair = ''] = cookie.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (value === '' || /max-age=0/i.test(cookie)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    return { status: res.status, json: text ? (JSON.parse(text) as unknown) : null };
  }
  get = (path: string) => this.request('GET', path);
  post = (path: string, body: unknown = {}) => this.request('POST', path, body);
}

const tokenOf = (link: string) => link.slice(link.indexOf('#') + 1);

const count = (from: string, params: unknown[] = []) => countRows(testDb.url, from, params);

/** Archiving is an admin command in a later slice; here the owner sets the flag directly. */
async function archiveByEmail(email: string): Promise<void> {
  await runAsOwner(testDb.url, 'UPDATE auth."user" SET "archivedAt" = now() WHERE email = $1', [email]);
}

async function enableTotp(browser: Browser, password: string): Promise<TOTP> {
  const enabled = await browser.post('/api/auth/two-factor/enable', { password });
  expect(enabled.status).toBe(200);
  const totp = URI.parse((enabled.json as { totpURI: string }).totpURI) as TOTP;
  const verified = await browser.post('/api/auth/two-factor/verify-totp', { code: totp.generate() });
  expect(verified.status).toBe(200);
  return totp;
}

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  await migrateDatabase(testDb.url);
  rt = createRuntime({
    databaseUrl: testDb.url,
    auth: { secret: randomBytes(32).toString('hex'), baseURL: ORIGIN },
  });
  app = createApp(rt);
});

afterAll(async () => {
  await rt.close();
  await testDb.drop();
});

describe('identity (F0.8)', () => {
  const admin = new Browser();
  let adminTotp: TOTP;
  let pmLink = '';

  it('refuses sign-up without an invitation', async () => {
    const res = await new Browser().post('/api/auth/sign-up/email', { ...ADMIN });
    expect(res.status).toBe(403);
    expect(await count('auth."user"')).toBe(0);
  });

  it('installation: the first admin gets an invitation; a second bootstrap is refused once a user exists', async () => {
    const first = await rt.kernel.execute(
      bootstrapAdmin,
      systemActor('install'),
      { email: ADMIN.email },
      'system',
    );
    const res = await admin.post('/api/invitations/accept', {
      token: first.token,
      name: ADMIN.name,
      password: ADMIN.password,
    });
    expect(res.status).toBe(201);
    await expect(
      rt.kernel.execute(bootstrapAdmin, systemActor('install'), { email: 'other@example.test' }, 'system'),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('an invitation link works once', async () => {
    const reuse = await rt.kernel
      .execute(bootstrapAdmin, systemActor('install'), { email: 'x@example.test' }, 'system')
      .catch((e: unknown) => e);
    expect(reuse).toMatchObject({ code: 'conflict' });
    const unknown = await new Browser().post('/api/invitations/accept', {
      token: 'a'.repeat(43),
      name: 'Person 09',
      password: 'some long password',
    });
    expect(unknown.status).toBe(404);
  });

  it('a signed-in user without MFA can do nothing but set it up', async () => {
    const res = await admin.get('/api/me');
    expect(res.status).toBe(403);
    expect(res.json).toMatchObject({ error: 'mfa_required' });
  });

  it('after TOTP is set up the user works with the roles from the invitation', async () => {
    adminTotp = await enableTotp(admin, ADMIN.password);
    const res = await admin.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ email: ADMIN.email, kind: 'staff', roles: ['admin'], mfaEnabled: true });
  });

  it('signing in again asks for the TOTP code before any session exists', async () => {
    const again = new Browser();
    const signIn = await again.post('/api/auth/sign-in/email', {
      email: ADMIN.email,
      password: ADMIN.password,
    });
    expect(signIn.status).toBe(200);
    expect(signIn.json).toMatchObject({ twoFactorRedirect: true });
    expect((await again.get('/api/me')).status).toBe(401);

    const wrong = await again.post('/api/auth/two-factor/verify-totp', { code: '000000' });
    expect(wrong.status).toBeGreaterThanOrEqual(400);
    const ok = await again.post('/api/auth/two-factor/verify-totp', { code: adminTotp.generate() });
    expect(ok.status).toBe(200);
    expect((await again.get('/api/me')).status).toBe(200);
  });

  it('a wrong password is refused', async () => {
    const res = await new Browser().post('/api/auth/sign-in/email', {
      email: ADMIN.email,
      password: 'wrong password!!',
    });
    expect(res.status).toBe(401);
  });

  it('an admin invites a PM by link; the PM joins with exactly the invited role', async () => {
    const invite = await admin.post('/api/users/invitations', { email: PM.email, roles: ['pm'] });
    expect(invite.status).toBe(201);
    pmLink = (invite.json as { link: string }).link;
    expect(pmLink).toMatch(/^http:\/\/localhost:3000\/accept-invitation#/);

    const pm = new Browser();
    expect((await pm.post('/api/invitations/accept', { token: tokenOf(pmLink), ...PM })).status).toBe(201);
    await enableTotp(pm, PM.password);
    expect((await pm.get('/api/me')).json).toMatchObject({ email: PM.email, roles: ['pm'] });

    // The PM role does not include inviting users (permission matrix).
    const denied = await pm.post('/api/users/invitations', { email: 'person03@example.test', roles: ['pm'] });
    expect(denied.status).toBe(403);
  });

  it('a used invitation link is refused', async () => {
    const res = await new Browser().post('/api/invitations/accept', {
      token: tokenOf(pmLink),
      name: 'Person 05',
      password: 'yet another passphrase',
    });
    expect(res.status).toBe(404);
  });

  it('inviting an existing user or with invalid input is refused with a clear error', async () => {
    expect((await admin.post('/api/users/invitations', { email: PM.email, roles: ['pm'] })).status).toBe(409);
    const invalid = await admin.post('/api/users/invitations', { email: 'not-an-email', roles: [] });
    expect(invalid.status).toBe(400);
    expect(invalid.json).toMatchObject({ error: 'validation_failed' });
  });

  it('a director may invite, but not grant the elevated roles admin or sponsor (no privilege escalation)', async () => {
    const DIRECTOR = { email: 'person03@example.test', name: 'Person 03', password: 'director passphrase 1' };
    const link = (
      (await admin.post('/api/users/invitations', { email: DIRECTOR.email, roles: ['director'] })).json as {
        link: string;
      }
    ).link;
    const director = new Browser();
    expect(
      (await director.post('/api/invitations/accept', { token: tokenOf(link), ...DIRECTOR })).status,
    ).toBe(201);
    await enableTotp(director, DIRECTOR.password);

    for (const role of ['admin', 'sponsor']) {
      const res = await director.post('/api/users/invitations', {
        email: 'person04@example.test',
        roles: [role],
      });
      expect(res.status).toBe(403);
    }
    const ok = await director.post('/api/users/invitations', {
      email: 'person04@example.test',
      roles: ['sales'],
    });
    expect(ok.status).toBe(201);
  });

  it('an archived user loses access at once and cannot sign in again', async () => {
    const LEAVER = { email: 'person06@example.test', name: 'Person 06', password: 'leaver passphrase 12' };
    const invite = await admin.post('/api/users/invitations', { email: LEAVER.email, roles: ['sales'] });
    const leaver = new Browser();
    const token = tokenOf((invite.json as { link: string }).link);
    expect((await leaver.post('/api/invitations/accept', { token, ...LEAVER })).status).toBe(201);
    await enableTotp(leaver, LEAVER.password);
    expect((await leaver.get('/api/me')).status).toBe(200);

    await archiveByEmail(LEAVER.email);
    expect((await leaver.get('/api/me')).status).toBe(401);
    const signIn = await new Browser().post('/api/auth/sign-in/email', {
      email: LEAVER.email,
      password: LEAVER.password,
    });
    expect(signIn.status).toBeGreaterThanOrEqual(400);
  });

  it('every change was audited: invitations and joins, with no token in the audit log', async () => {
    expect(await count(`audit_event WHERE command = 'identity.invitation.bootstrapAdmin'`)).toBe(1);
    expect(await count(`audit_event WHERE command = 'identity.user.invite'`)).toBe(4);
    expect(await count(`audit_event WHERE command = 'identity.invitation.accept'`)).toBe(4);
    expect(await count(`audit_event WHERE after::text ILIKE '%token%'`)).toBe(0);
  });

  it('stores only a hash of invitation tokens and no plain passwords', async () => {
    expect(await count('auth.invitation WHERE token_hash = $1', [tokenOf(pmLink)])).toBe(0);
    expect(await count('auth.account WHERE password = $1', [PM.password])).toBe(0);
  });
});
