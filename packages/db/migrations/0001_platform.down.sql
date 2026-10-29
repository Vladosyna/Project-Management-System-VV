-- Reverts 0001. The cluster-wide role ocs_app is kept: other databases on the server may use it.
DROP TABLE outbox;
DROP TABLE audit_event;
DROP FUNCTION app.forbid_change();
DROP FUNCTION app.is_internal();
DROP FUNCTION app.client_ids();
DROP FUNCTION app.actor_kind();
DROP FUNCTION app.actor_id();
REVOKE USAGE ON SCHEMA public FROM ocs_app;
DROP SCHEMA app;
