-- Reverts 0002. The cluster-wide role ocs_auth is kept: other databases on the server may use it.
DROP TABLE auth.user_role;
DROP TABLE auth.invitation;
DROP TABLE auth.passkey;
DROP TABLE auth."twoFactor";
DROP TABLE auth.verification;
DROP TABLE auth.account;
DROP TABLE auth.session;
DROP TABLE auth."user";
REVOKE USAGE ON SCHEMA auth FROM ocs_app;
DROP SCHEMA auth;
