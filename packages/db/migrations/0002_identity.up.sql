-- 0002 identity (F0.8): login tables used by better-auth, invitations and role grants.
-- Credentials (password hashes, TOTP secrets, passkeys, session tokens) live in schema `auth` and are
-- reachable only by role ocs_auth. Business code (ocs_app) sees safe user columns, invitations and roles.
-- Table and column names of the better-auth tables follow better-auth 1.7 (camelCase, quoted).

DO $$
BEGIN
  CREATE ROLE ocs_auth NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
EXCEPTION
  WHEN duplicate_object OR unique_violation THEN NULL;
END
$$;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO ocs_auth, ocs_app;

CREATE TABLE auth."user" (
  id                 uuid PRIMARY KEY,
  name               text NOT NULL,
  email              text NOT NULL UNIQUE,
  "emailVerified"    boolean NOT NULL DEFAULT false,
  image              text,
  "createdAt"        timestamptz NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz NOT NULL DEFAULT now(),
  "twoFactorEnabled" boolean DEFAULT false,
  kind               text NOT NULL CHECK (kind IN ('staff', 'client', 'partner', 'system')),
  "archivedAt"       timestamptz
);

CREATE TABLE auth.session (
  id          uuid PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token       text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId"    uuid NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE
);
CREATE INDEX session_user_id ON auth.session ("userId");

CREATE TABLE auth.account (
  id                      uuid PRIMARY KEY,
  "accountId"             text NOT NULL,
  "providerId"            text NOT NULL,
  "userId"                uuid NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope                   text,
  password                text,
  "createdAt"             timestamptz NOT NULL DEFAULT now(),
  "updatedAt"             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_user_id ON auth.account ("userId");

CREATE TABLE auth.verification (
  id          uuid PRIMARY KEY,
  identifier  text NOT NULL,
  value       text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier ON auth.verification (identifier);

CREATE TABLE auth."twoFactor" (
  id                        uuid PRIMARY KEY,
  secret                    text NOT NULL,
  "backupCodes"             text NOT NULL,
  "userId"                  uuid NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE,
  verified                  boolean DEFAULT true,
  "failedVerificationCount" integer DEFAULT 0,
  "lockedUntil"             timestamptz
);
CREATE INDEX two_factor_user_id ON auth."twoFactor" ("userId");

CREATE TABLE auth.passkey (
  id             uuid PRIMARY KEY,
  name           text,
  "publicKey"    text NOT NULL,
  "userId"       uuid NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE,
  "credentialID" text NOT NULL,
  counter        integer NOT NULL,
  "deviceType"   text NOT NULL,
  "backedUp"     boolean NOT NULL,
  transports     text,
  "createdAt"    timestamptz,
  aaguid         text
);
CREATE INDEX passkey_user_id ON auth.passkey ("userId");

-- Invitations: the only way to get an account (D-10). The link token is shown once; only its hash is stored.
CREATE TABLE auth.invitation (
  id               uuid PRIMARY KEY,
  email            text NOT NULL,
  kind             text NOT NULL CHECK (kind IN ('staff', 'client', 'partner')),
  roles            text[] NOT NULL,
  token_hash       text NOT NULL UNIQUE,
  invited_by       uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  accepted_at      timestamptz,
  accepted_user_id uuid REFERENCES auth."user" (id),
  revoked_at       timestamptz
);
CREATE INDEX invitation_email ON auth.invitation (lower(email));

-- Role grants: revoked by setting revoked_at, never deleted.
CREATE TABLE auth.user_role (
  id         uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth."user" (id),
  role       text NOT NULL,
  granted_by uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX user_role_active ON auth.user_role (user_id, role) WHERE revoked_at IS NULL;

-- better-auth: full use of its tables; rows of technical tables may be removed (sessions, codes, keys),
-- users and accounts never (archive instead).
GRANT SELECT, INSERT, UPDATE ON auth."user", auth.session, auth.account, auth.verification,
  auth."twoFactor", auth.passkey TO ocs_auth;
GRANT DELETE ON auth.session, auth.verification, auth."twoFactor", auth.passkey TO ocs_auth;

-- Business code: safe user columns only; invitations and role grants through audited commands.
GRANT SELECT (id, name, email, kind, "archivedAt", "twoFactorEnabled", "createdAt") ON auth."user" TO ocs_app;
GRANT SELECT, INSERT, UPDATE ON auth.invitation, auth.user_role TO ocs_app;

ALTER TABLE auth."user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_auth ON auth."user" FOR ALL TO ocs_auth USING (true) WITH CHECK (true);
CREATE POLICY user_read ON auth."user" FOR SELECT TO ocs_app USING (app.is_internal() OR id = app.actor_id());

ALTER TABLE auth.invitation ENABLE ROW LEVEL SECURITY;
CREATE POLICY invitation_internal ON auth.invitation FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());

ALTER TABLE auth.user_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_role_internal ON auth.user_role FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
CREATE POLICY user_role_own ON auth.user_role FOR SELECT TO ocs_app USING (user_id = app.actor_id());

-- Tables only better-auth touches: RLS on with an ocs_auth-only policy, so no other role can read them.
ALTER TABLE auth.session ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_auth ON auth.session FOR ALL TO ocs_auth USING (true) WITH CHECK (true);
ALTER TABLE auth.account ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_auth ON auth.account FOR ALL TO ocs_auth USING (true) WITH CHECK (true);
ALTER TABLE auth.verification ENABLE ROW LEVEL SECURITY;
CREATE POLICY verification_auth ON auth.verification FOR ALL TO ocs_auth USING (true) WITH CHECK (true);
ALTER TABLE auth."twoFactor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY two_factor_auth ON auth."twoFactor" FOR ALL TO ocs_auth USING (true) WITH CHECK (true);
ALTER TABLE auth.passkey ENABLE ROW LEVEL SECURITY;
CREATE POLICY passkey_auth ON auth.passkey FOR ALL TO ocs_auth USING (true) WITH CHECK (true);
