// D-33 / D-07: OCS as an OAuth 2.1 provider for AI clients, over HTTP against PostgreSQL (migration 0020).
// Covers what MCP clients do before the person signs in: discovery, dynamic client registration, the authorize
// redirect to the OCS sign-in, and the refusals that keep an agent tied to a person.
import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createRuntime, migrateDatabase, type Runtime } from '@ocs/core/runtime';
import { countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { createApp } from '../app.ts';

const ORIGIN = 'http://localhost:3000';
const REDIRECT = 'http://127.0.0.1:33418/callback';
let testDb: TestDatabase;
let rt: Runtime;
let app: ReturnType<typeof createApp>;

const call = async (method: string, path: string, body?: unknown) => {
  const headers = new Headers({ origin: ORIGIN });
  if (body !== undefined) headers.set('content-type', 'application/json');
  const res = await app.request(`${ORIGIN}${path}`, {
    method,
    headers,
    redirect: 'manual',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, location: res.headers.get('location') };
};

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

describe('OCS as an OAuth 2.1 provider (D-33)', () => {
  it('publishes its metadata: authorization code + PKCE, refresh tokens, no client_credentials', async () => {
    const r = await call('GET', '/api/auth/.well-known/oauth-authorization-server');
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ issuer: expect.any(String) as string });
    expect(r.json?.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
    expect(r.json?.code_challenge_methods_supported).toContain('S256');
    expect(r.json?.registration_endpoint).toEqual(expect.stringContaining('/oauth2/register'));
  });

  it('an MCP client registers itself (RFC 7591); the client is stored in auth."oauthClient"', async () => {
    const r = await call('POST', '/api/auth/oauth2/register', {
      client_name: 'Test agent',
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    });
    expect([r.status, typeof r.json?.client_id], JSON.stringify(r.json)).toEqual([201, 'string']);
    expect(await countRows(testDb.url, 'auth."oauthClient" WHERE "clientId" = $1', [r.json?.client_id])).toBe(
      1,
    );
  });

  it('authorize without a session sends the person to the OCS sign-in (with its MFA)', async () => {
    const reg = await call('POST', '/api/auth/oauth2/register', {
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
    });
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: String(reg.json?.client_id),
      redirect_uri: REDIRECT,
      scope: 'openid offline_access',
      state: 'xyz',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    const r = await call('GET', `/api/auth/oauth2/authorize?${q.toString()}`);
    expect(r.status).toBeGreaterThanOrEqual(300);
    expect(r.status).toBeLessThan(400);
    expect(r.location).toMatch(/\/login\?/);
  });

  it('refuses a client that asks for client_credentials (a token without a person)', async () => {
    const r = await call('POST', '/api/auth/oauth2/register', {
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['client_credentials'],
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});
