-- 0025_add_site_proposal — additive and reversible (ocs-db-migration); never edit once on main.
-- D-43: the planned devices of a store from the proposal (model × count), recorded right after the proposal is issued
-- and before any device has a serial number. The quotation takes its counts from here. A revised proposal is a new
-- version; the previous one is archived, never deleted. Internal only.
CREATE TABLE site_proposal (
  id            uuid PRIMARY KEY,
  client_id     uuid NOT NULL,
  site_id       uuid NOT NULL,
  version       integer NOT NULL CHECK (version > 0),
  -- [{model, count}] — validated by the command (zod); at least one line.
  items         jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0),
  -- Proposal document reference (number, folder path or link).
  proposal_ref  text NOT NULL CHECK (btrim(proposal_ref) <> ''),
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  UNIQUE (site_id, version),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id)
);
-- One active proposal per store.
CREATE UNIQUE INDEX site_proposal_active ON site_proposal (site_id) WHERE archived_at IS NULL;
CREATE INDEX site_proposal_client ON site_proposal (client_id);

ALTER TABLE site_proposal ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_proposal_internal ON site_proposal FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
-- No DELETE: archive with archived_at (SOP-DEL-02 "never delete").
GRANT SELECT, INSERT, UPDATE ON site_proposal TO ocs_app;
