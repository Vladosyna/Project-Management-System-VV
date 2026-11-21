// better-auth wiring (ADR-001 P-06, D-10): OCS-native accounts, invitation only, password or passkey,
// TOTP MFA. Credentials stay in schema `auth` behind role ocs_auth (migration 0002).
import { AsyncLocalStorage } from 'node:async_hooks';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { oauthProvider } from '@better-auth/oauth-provider';
import { v7 as uuidv7 } from 'uuid';
import type { AuthPool } from './repository.ts';

export interface AuthConfig {
  /** Pool from @ocs/db createAuthPool — runs as ocs_auth. */
  readonly database: AuthPool;
  /** ≥ 32 random characters, from the secret store / environment only. */
  readonly secret: string;
  /** Public origin of the app, e.g. https://ocs.example.eu — passkeys are bound to its host. */
  readonly baseURL: string;
}

/** The invitation being accepted in the current request — the only context in which an account may be created. */
export interface InvitationScope {
  readonly email: string;
  readonly kind: 'staff' | 'client' | 'partner';
}
export const invitationScope = new AsyncLocalStorage<InvitationScope>();

const SESSION_HOURS = 12;
/** D-33: an AI agent's access token is short-lived; its refresh token rotates and is revocable. */
const AGENT_ACCESS_TOKEN_SECONDS = 3600;
const AGENT_REFRESH_TOKEN_SECONDS = 30 * 24 * 3600;

/** The OCS MCP endpoint, the one protected resource agents get tokens for (apps/mcp, D-33). */
export const mcpResource = (baseURL: string) => `${new URL(baseURL).origin}/mcp`;

export function createAuth(config: AuthConfig) {
  if (config.secret.length < 32) throw new Error('Auth secret must be at least 32 characters');
  const url = new URL(config.baseURL);
  return betterAuth({
    appName: 'OCS',
    baseURL: config.baseURL,
    basePath: '/api/auth',
    secret: config.secret,
    database: config.database,
    trustedOrigins: [url.origin],
    telemetry: { enabled: false },
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, autoSignIn: true },
    user: {
      additionalFields: {
        // Set only by the invitation hook below; NOT NULL in the database, so a user without it is refused.
        kind: { type: 'string', required: false, input: false },
        archivedAt: { type: 'date', required: false, input: false },
      },
    },
    session: { expiresIn: SESSION_HOURS * 3600, updateAge: 3600 },
    advanced: {
      // UUID v7 ids, like every OCS table (03-engineering-rules §6); Actor.id and audit expect UUIDs.
      database: { generateId: () => uuidv7() },
      useSecureCookies: url.protocol === 'https:',
      defaultCookieAttributes: { sameSite: 'strict', httpOnly: true },
    },
    plugins: [
      twoFactor({ issuer: 'OCS' }),
      passkey({ rpID: url.hostname, rpName: 'OCS', origin: url.origin }),
      // D-33 / D-07: OCS as an OAuth 2.1 provider, so AI clients (ChatGPT, Claude, any MCP client) sign in AS the
      // person — through the normal OCS sign-in with MFA — and get only that person's permissions. Migration 0020.
      oauthProvider({
        loginPage: '/login',
        consentPage: '/oauth/consent',
        // Opaque tokens, stored hashed, checked on every call, revoked at once; client secrets stored encrypted.
        disableJwtPlugin: true,
        // An agent always acts for a person: no client_credentials (a token without a person).
        grantTypes: ['authorization_code', 'refresh_token'],
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        // MCP clients register themselves (RFC 7591); the person's consent and PKCE are what guard access.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationRequirePKCE: true,
        // Desktop agents (Claude Desktop/Code, Cursor) call back on loopback http (RFC 8252): native when inferred.
        clientRegistrationDefaultApplicationType: 'infer',
        resources: [{ identifier: mcpResource(config.baseURL), name: 'OCS MCP' }],
        accessTokenExpiresIn: AGENT_ACCESS_TOKEN_SECONDS,
        refreshTokenExpiresIn: AGENT_REFRESH_TOKEN_SECONDS,
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-up/email' && !invitationScope.getStore()) {
          throw new APIError('FORBIDDEN', { message: 'Accounts are created by invitation only' });
        }
        return Promise.resolve();
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const scope = invitationScope.getStore();
            if (!scope) return Promise.resolve(false);
            return Promise.resolve({ data: { ...user, email: scope.email, kind: scope.kind } });
          },
        },
      },
      session: {
        create: {
          before: async (session, ctx) => {
            const user = await ctx?.context.internalAdapter.findUserById(session.userId);
            return user && !(user as { archivedAt?: Date | null }).archivedAt ? undefined : false;
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
