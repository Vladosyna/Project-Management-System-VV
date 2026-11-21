// D-33: AI agent tokens checked by introspection once an admin has set up the MCP resource client — the audit names
// the agent ("via mcp:<agent>") and /mcp accepts only tokens issued for /mcp. Over HTTP against PostgreSQL.
import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { URI, type TOTP } from 'otpauth';
import { bootstrapAdmin } from '@ocs/core/identity';
import { systemActor } from '@ocs/core/kernel';
import { createRuntime, migrateDatabase, type Runtime } from '@ocs/core/runtime';
import { countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { createApp } from '../app.ts';

const O = 'http://localhost:3000';
const CALLBACK = 'http://127.0.0.1:9/cb';
let testDb: TestDatabase;
let rt: Runtime;
let app: ReturnType<typeof createApp>;
const jar = new Map<string, string>();

const request = async (
  target: ReturnType<typeof createApp>,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => {
  const h = new Headers({ origin: O, ...headers });
  if (jar.size && !h.has('authorization')) h.set('cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
  if (body !== undefined && !h.has('content-type')) h.set('content-type', 'application/json');
  const res = await target.request(`${O}${path}`, {
    method,
    headers: h,
    redirect: 'manual',
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
  for (const c of res.headers.getSetCookie()) {
    const [pair = ''] = c.split(';');
    const i = pair.indexOf('=');
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const text = await res.text();
  let json: Record<string, unknown> | null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { status: res.status, json, location: res.headers.get('location') };
};

/** An agent registers, the signed-in admin consents, the agent exchanges the code (optionally for /mcp). */
async function agentToken(name: string, resource?: string): Promise<string> {
  const reg = await request(app, 'POST', '/api/auth/oauth2/register', {
    client_name: name,
    redirect_uris: [CALLBACK],
    token_endpoint_auth_method: 'none',
  });
  const clientId = String(reg.json?.client_id);
  const verifier = randomBytes(32).toString('base64url');
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CALLBACK,
    scope: 'openid',
    state: 's',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    ...(resource ? { resource } : {}),
  });
  const authorize = await request(app, 'GET', `/api/auth/oauth2/authorize?${q.toString()}`);
  const consent = await request(app, 'POST', '/api/auth/oauth2/consent', {
    accept: true,
    oauth_query: new URL(authorize.location ?? '', O).search.slice(1),
  });
  const code = new URL(String(consent.json?.url), O).searchParams.get('code') ?? '';
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CALLBACK,
    client_id: clientId,
    code_verifier: verifier,
    ...(resource ? { resource } : {}),
  });
  const token = await request(app, 'POST', '/api/auth/oauth2/token', form.toString(), {
    'content-type': 'application/x-www-form-urlencoded',
  });
  return String(token.json?.access_token);
}

const mcp = (
  target: ReturnType<typeof createApp>,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
) =>
  request(
    target,
    'POST',
    '/mcp',
    { jsonrpc: '2.0', id: 1, method, params },
    { authorization: `Bearer ${token}`, accept: 'application/json, text/event-stream' },
  );

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  await migrateDatabase(testDb.url);
  rt = createRuntime({
    databaseUrl: testDb.url,
    auth: { secret: randomBytes(32).toString('hex'), baseURL: O },
  });
  app = createApp(rt);
  const inv = await rt.kernel.execute(
    bootstrapAdmin,
    systemActor('install'),
    { email: 'person01@example.test' },
    'system',
  );
  await request(app, 'POST', '/api/invitations/accept', {
    token: inv.token,
    name: 'Person 01',
    password: 'correct horse battery staple',
  });
  const enabled = await request(app, 'POST', '/api/auth/two-factor/enable', {
    password: 'correct horse battery staple',
  });
  const totp = URI.parse(String(enabled.json?.totpURI)) as TOTP;
  await request(app, 'POST', '/api/auth/two-factor/verify-totp', { code: totp.generate() });
});

afterAll(async () => {
  await rt.close();
  await testDb.drop();
});

describe('AI agent tokens by introspection (D-33)', () => {
  let introspected: ReturnType<typeof createApp>;

  it('an admin sets up the resource client once; the secret is returned for the secret store', async () => {
    const r = await request(app, 'POST', '/api/admin/agent-resource-client');
    expect([r.status, typeof r.json?.clientId, typeof r.json?.clientSecret]).toEqual([
      201,
      'string',
      'string',
    ]);
    introspected = createApp(rt, {
      introspection: { clientId: String(r.json?.clientId), clientSecret: String(r.json?.clientSecret) },
    });
  });

  it('the audit names the agent: "via mcp:<agent>"', async () => {
    const token = await agentToken('Agent X', `${O}/mcp`);
    expect((await mcp(introspected, token, 'tools/list')).status).toBe(200);
    const call = await mcp(introspected, token, 'tools/call', {
      name: 'identity_user_invite',
      arguments: { email: 'person09@example.test', roles: ['pm'] },
    });
    expect(call.status).toBe(200);
    expect(
      await countRows(testDb.url, `audit_event WHERE command = 'identity.user.invite' AND actor_via = $1`, [
        'mcp:Agent X',
      ]),
    ).toBe(1);
  });

  it('/mcp refuses a token not issued for /mcp; REST, which names no audience, accepts it', async () => {
    const token = await agentToken('Agent Y');
    expect((await mcp(introspected, token, 'tools/list')).status).toBe(401);
    const rest = await request(
      introspected,
      'POST',
      '/api/v1/org.site.list',
      {},
      { authorization: `Bearer ${token}` },
    );
    expect(rest.status).toBe(200);
  });
});
