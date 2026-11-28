-- 0027_add_record_part_country_compliance — additive and reversible (ocs-db-migration); never edit once on main.
-- D-45 (2): a client PO, client invoice or client quotation covers all of the work or one part — hardware or
-- installation. Existing rows cover all of the work.
ALTER TABLE commercial_record ADD COLUMN part text NOT NULL DEFAULT 'all'
  CHECK (part IN ('all', 'hardware', 'installation'));
ALTER TABLE client_quotation ADD COLUMN part text NOT NULL DEFAULT 'all'
  CHECK (part IN ('all', 'hardware', 'installation'));

-- D-45 (3): whether a client agrees DPIA and LPA per store or once per country (Client A today: per country).
ALTER TABLE client ADD COLUMN compliance_scope text NOT NULL DEFAULT 'site'
  CHECK (compliance_scope IN ('site', 'country'));

-- D-45 (3)(4): a DPIA or LPA approved once for a client's country; it covers every store of the client there.
-- From an AI agent it waits for a person's confirmation, like commercial records. Internal only.
CREATE TABLE country_compliance (
  id            uuid PRIMARY KEY,
  client_id     uuid NOT NULL REFERENCES client (id),
  country_code  text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  kind          text NOT NULL CHECK (kind IN ('dpia', 'lpa')),
  status        text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reference     text,
  record_date   date NOT NULL,
  source_ref    text,
  proposed_by   uuid NOT NULL,
  proposed_via  text NOT NULL CHECK (proposed_via IN ('web', 'ai')),
  confirmed_by  uuid,
  confirmed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz
);
-- One active record per client, country and kind; a change archives the previous one.
CREATE UNIQUE INDEX country_compliance_active ON country_compliance (client_id, country_code, kind)
  WHERE archived_at IS NULL;

ALTER TABLE country_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY country_compliance_internal ON country_compliance FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
-- No DELETE: archive with archived_at (SOP-DEL-02 "never delete").
GRANT SELECT, INSERT, UPDATE ON country_compliance TO ocs_app;
