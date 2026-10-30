# ADR-002 — Identity: accounts, MFA, sessions

- Status: Proposed (F0.8b) — for the architect role to accept with the PR
- Date: 30 Oct 2026
- Builds on: ADR-001 P-06 (better-auth), D-10 (OCS-native accounts, no client SSO)

## Decisions

1. **Invitation only.** Nobody signs up. An admin or director invites by link (`POST /api/users/invitations`); the first admin comes from the installation script `bootstrap-admin`, which is refused once any user exists. The link token is 256 random bits, travels in the URL fragment (never in server logs), is shown once and stored only as a SHA-256 hash; it expires after 7 days and works once.
2. **better-auth's own sign-up endpoint is refused.** The accept endpoint validates the invitation, then creates the account inside better-auth within an `AsyncLocalStorage` scope; a hook refuses `/sign-up/email` outside that scope and a database hook refuses to create any user without it. Email and kind always come from the invitation, never from the request.
3. **Roles are granted by an audited command** (`identity.invitation.accept`, system actor) right after the account exists. An inviter may put `admin` or `sponsor` on an invitation only if they may assign roles (admin) — no privilege escalation by director.
4. **MFA is mandatory.** A session without TOTP set up reaches only better-auth's own endpoints (enable TOTP, sign out); every OCS endpoint answers `403 mfa_required`. Sign-in for a user with TOTP returns `twoFactorRedirect` and creates no session until the code is verified. Passkeys are enabled as an additional sign-in method (WebAuthn, bound to `OCS_PUBLIC_URL`'s host).
5. **Credentials are walled off in the database.** Schema `auth` holds better-auth's tables; better-auth connects as role `ocs_auth` (set per connection). Business code (`ocs_app`) can read only safe user columns, invitations and role grants — never password hashes, TOTP secrets, passkeys or session tokens (RLS suite asserts this). Users and accounts are never deleted: archiving ends access at once (sessions refused, actor not resolved).
6. **Sessions** last 12 hours, refreshed hourly; cookies are `HttpOnly`, `SameSite=Strict`, `Secure` on https. better-auth telemetry is disabled.

## Known gaps — for the security review before any external user (03 §7)

- TOTP codes are not single-use within their 30-second window (better-auth 1.7 has no replay check).
- ~~Passkey ceremonies not covered by automated tests~~ — covered since F0.9b: `tools/e2e` registers a passkey on a Chromium virtual authenticator and signs in with it.
- Rate limiting relies on better-auth's built-in limiter (in-memory per instance); a shared store is needed with more than one API instance.
- No self-service password reset yet (needs staff email sending; until then an admin re-invites).
- Archiving and role changes are admin commands in a follow-up slice; the archive flag is honoured everywhere already.
