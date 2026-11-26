-- 0023_add_installer_jobs — additive and reversible (ocs-db-migration); never edit once on main.
-- D-34 N1 (E12): installer jobs per site, installer price proposals (quotes) and the CEO's approval of the chosen
-- quote (supplier rules P-03, P-08, P-11, P-12). Money as in commercial_record (0022): original currency + EUR with
-- the rate used; an AI agent's proposal waits for a PM's confirmation. Internal only: the partner app (V1.1) and the
-- client never read these tables; installers' real names stay in `partner` (staff only).
CREATE TABLE installer_job (
  id            uuid PRIMARY KEY,
  client_id     uuid NOT NULL,
  site_id       uuid NOT NULL,
  partner_id    uuid REFERENCES partner (id),
  -- partial: our engineer configures, the installer mounts and cables; full: the installer does everything on site.
  scope         text NOT NULL CHECK (scope IN ('partial', 'full')),
  sensor_count  integer NOT NULL CHECK (sensor_count > 0),
  sow_version   text CHECK (sow_version IS NULL OR btrim(sow_version) <> ''),
  sow_sent_on   date,
  scheduled_on  date,
  status        text NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned', 'quoting', 'approved', 'scheduled', 'done', 'attended_not_ready',
                                  'cancelled')),
  outcome_note  text,
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  UNIQUE (id, client_id),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id)
);
CREATE INDEX installer_job_site ON installer_job (site_id) WHERE archived_at IS NULL;
CREATE INDEX installer_job_client ON installer_job (client_id);

CREATE TABLE price_proposal (
  id            uuid PRIMARY KEY,
  client_id     uuid NOT NULL,
  job_id        uuid NOT NULL,
  partner_id    uuid NOT NULL REFERENCES partner (id),
  sow_version   text,
  -- [{kind: unit|hour|travel|extra, description, quantity, unitPrice}], validated by the command (zod).
  lines         jsonb NOT NULL CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) > 0),
  amount        numeric(14, 2) NOT NULL CHECK (amount >= 0),
  currency      char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  eur_amount    numeric(14, 2) NOT NULL CHECK (eur_amount >= 0),
  fx_rate       numeric(14, 6) NOT NULL CHECK (fx_rate > 0 AND (currency <> 'EUR' OR fx_rate = 1)),
  fx_date       date NOT NULL,
  fx_source     text NOT NULL CHECK (fx_source IN ('manual', 'agent', 'ecb')),
  valid_until   date,
  source_kind   text NOT NULL CHECK (source_kind IN ('mail', 'pdf', 'xlsx', 'whatsapp', 'manual')),
  source_ref    text,
  proposed_by   uuid NOT NULL,
  proposed_via  text NOT NULL CHECK (proposed_via IN ('web', 'ai')),
  confirmed_by  uuid,
  confirmed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  CHECK ((confirmed_by IS NULL) = (confirmed_at IS NULL)),
  UNIQUE (id, client_id),
  FOREIGN KEY (job_id, client_id) REFERENCES installer_job (id, client_id)
);
CREATE INDEX price_proposal_job ON price_proposal (job_id) WHERE archived_at IS NULL;
CREATE INDEX price_proposal_client ON price_proposal (client_id);

-- P-11: the CEO approves the chosen quote; a person records it with its reference (DingTalk OA or message). P-12: a
-- single quote only with a reason. One active approval per job.
CREATE TABLE quote_approval (
  id                  uuid PRIMARY KEY,
  client_id           uuid NOT NULL,
  job_id              uuid NOT NULL,
  proposal_id         uuid NOT NULL,
  approval_ref        text NOT NULL CHECK (btrim(approval_ref) <> ''),
  approved_on         date NOT NULL,
  single_quote_reason text CHECK (single_quote_reason IS NULL OR btrim(single_quote_reason) <> ''),
  recorded_by         uuid NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  archived_at         timestamptz,
  FOREIGN KEY (job_id, client_id) REFERENCES installer_job (id, client_id),
  FOREIGN KEY (proposal_id, client_id) REFERENCES price_proposal (id, client_id)
);
CREATE UNIQUE INDEX quote_approval_one_per_job ON quote_approval (job_id) WHERE archived_at IS NULL;
CREATE INDEX quote_approval_client ON quote_approval (client_id);

ALTER TABLE installer_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_approval ENABLE ROW LEVEL SECURITY;
CREATE POLICY installer_job_internal ON installer_job FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
CREATE POLICY price_proposal_internal ON price_proposal FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
CREATE POLICY quote_approval_internal ON quote_approval FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
-- No DELETE: archive with archived_at (SOP-DEL-02 "never delete").
GRANT SELECT, INSERT, UPDATE ON installer_job, price_proposal, quote_approval TO ocs_app;
