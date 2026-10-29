-- 0001 platform: application role, actor context, append-only audit, outbox.
-- 02-architecture §3–4, 03-engineering-rules §6. Every business table added later follows the same pattern:
-- RLS enabled, policies for ocs_app only, grants without DELETE.

-- Application role. The service's login role is granted membership by infra; every transaction runs
-- `SET LOCAL ROLE ocs_app`, so even a misconfigured privileged login is subject to RLS.
DO $$
BEGIN
  CREATE ROLE ocs_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
EXCEPTION
  WHEN duplicate_object OR unique_violation THEN NULL; -- role is cluster-wide; it may already exist
END
$$;

CREATE SCHEMA app;
GRANT USAGE ON SCHEMA app TO ocs_app;
GRANT USAGE ON SCHEMA public TO ocs_app;

-- Actor context, set per transaction by the kernel (set_config(..., true)). Unset → NULL → deny.
CREATE FUNCTION app.actor_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.actor_id', true), '')::uuid $$;

CREATE FUNCTION app.actor_kind() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.actor_kind', true), '') $$;

CREATE FUNCTION app.client_ids() RETURNS uuid[]
  LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('app.client_ids', true), '')::uuid[], '{}') $$;

CREATE FUNCTION app.is_internal() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT coalesce(app.actor_kind() IN ('staff', 'system'), false) $$;

GRANT EXECUTE ON FUNCTION app.actor_id(), app.actor_kind(), app.client_ids(), app.is_internal() TO ocs_app;

CREATE FUNCTION app.forbid_change() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only (03-engineering-rules §6)', TG_TABLE_NAME;
END
$$;

-- Audit: exactly one row per command, written by the kernel in the command's transaction.
CREATE TABLE audit_event (
  id          uuid PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid NOT NULL,
  actor_kind  text NOT NULL CHECK (actor_kind IN ('staff', 'client', 'partner', 'system')),
  actor_via   text,
  command     text NOT NULL,
  description text NOT NULL,
  object_type text NOT NULL,
  object_id   text NOT NULL,
  client_id   uuid,
  before      jsonb,
  after       jsonb,
  source      text NOT NULL
);
CREATE INDEX audit_event_object ON audit_event (object_type, object_id, at);
CREATE INDEX audit_event_client ON audit_event (client_id, at) WHERE client_id IS NOT NULL;

ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_event_insert ON audit_event FOR INSERT TO ocs_app
  WITH CHECK (actor_id = app.actor_id() AND actor_kind = app.actor_kind());
CREATE POLICY audit_event_read_internal ON audit_event FOR SELECT TO ocs_app
  USING (app.is_internal());
GRANT SELECT, INSERT ON audit_event TO ocs_app;
CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_event
  FOR EACH STATEMENT EXECUTE FUNCTION app.forbid_change();

-- Outbox: domain events written in the command's transaction; the worker (system actor) publishes them.
CREATE TABLE outbox (
  id           uuid PRIMARY KEY,
  created_at   timestamptz NOT NULL DEFAULT now(),
  event_type   text NOT NULL,
  payload      jsonb NOT NULL,
  client_id    uuid,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'dead')),
  attempts     integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  last_error   text
);
CREATE INDEX outbox_pending ON outbox (available_at) WHERE status = 'pending';

ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY outbox_insert ON outbox FOR INSERT TO ocs_app
  WITH CHECK (app.actor_kind() IS NOT NULL);
CREATE POLICY outbox_read_system ON outbox FOR SELECT TO ocs_app
  USING (app.actor_kind() = 'system');
CREATE POLICY outbox_update_system ON outbox FOR UPDATE TO ocs_app
  USING (app.actor_kind() = 'system') WITH CHECK (app.actor_kind() = 'system');
GRANT SELECT, INSERT, UPDATE ON outbox TO ocs_app;
