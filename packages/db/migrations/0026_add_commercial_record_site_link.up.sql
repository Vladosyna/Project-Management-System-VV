-- 0026_add_commercial_record_site_link — additive and reversible (ocs-db-migration); never edit once on main.
-- D-44: a client PO may cover a batch of stores in one country. commercial_record.site_id stays the store the record
-- was entered on; this table lists every further store the same record covers. Same client enforced by the keys.
-- Internal only.
CREATE UNIQUE INDEX commercial_record_id_client ON commercial_record (id, client_id);

CREATE TABLE commercial_record_site_link (
  record_id   uuid NOT NULL,
  client_id   uuid NOT NULL,
  site_id     uuid NOT NULL,
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  FOREIGN KEY (record_id, client_id) REFERENCES commercial_record (id, client_id),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id)
);
-- A store is linked once to a record while the link is active.
CREATE UNIQUE INDEX commercial_record_site_link_active ON commercial_record_site_link (record_id, site_id)
  WHERE archived_at IS NULL;
CREATE INDEX commercial_record_site_link_site ON commercial_record_site_link (site_id) WHERE archived_at IS NULL;

ALTER TABLE commercial_record_site_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY commercial_record_site_link_internal ON commercial_record_site_link FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
-- No DELETE: archive with archived_at (SOP-DEL-02 "never delete").
GRANT SELECT, INSERT, UPDATE ON commercial_record_site_link TO ocs_app;
