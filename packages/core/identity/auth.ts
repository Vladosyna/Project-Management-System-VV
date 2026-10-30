// better-auth wiring (ADR-001 P-06, D-10): OCS-native accounts, invitation only, password or passkey,
// TOTP MFA. Credentials stay in schema `auth` behind role ocs_auth (migration 0002).
import { AsyncLocalStorage } from 'node:async_hooks';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
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
