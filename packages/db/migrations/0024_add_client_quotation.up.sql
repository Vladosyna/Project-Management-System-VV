-- 0024_add_client_quotation — additive and reversible (ocs-db-migration); never edit once on main.
-- D-40: client quotations drafted by OCS (PMI first). Configuration per client × country (currency, hourly rate, tax
-- mode, seller entity, bank, terms), model prices, and the quotation itself: sensor and installation lines, hours by
-- the time standard and as quoted (override needs a reason), tax, totals. Internal only; a person sends it.
CREATE TABLE client_quote_config (
  id            uuid PRIMARY KEY,
  client_id     uuid NOT NULL REFERENCES client (id),
  country_code  text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  currency      char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  hourly_rate   numeric(14, 2) NOT NULL CHECK (hourly_rate > 0),
  -- reverse_charge: VAT 0, the recipient pays (contract with the client); ddp_local_vat: Vionvision pays local VAT.
  tax_mode      text NOT NULL CHECK (tax_mode IN ('reverse_charge', 'ddp_local_vat')),
  vat_rate      numeric(5, 2) CHECK (vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate < 100)),
  -- Seller entity, client billing details, bank details and terms as entered by a director (no secrets).
  seller        jsonb NOT NULL,
  buyer         jsonb NOT NULL,
  bank          jsonb NOT NULL,
  terms         jsonb NOT NULL CHECK (jsonb_typeof(terms) = 'array'),
  number_prefix text NOT NULL CHECK (number_prefix ~ '^[A-Z0-9-]{1,20}$'),
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  CHECK ((tax_mode = 'ddp_local_vat') = (vat_rate IS NOT NULL))
);
CREATE UNIQUE INDEX client_quote_config_active ON client_quote_config (client_id, country_code)
  WHERE archived_at IS NULL;

CREATE TABLE sensor_price (
  id          uuid PRIMARY KEY,
  client_id   uuid NOT NULL REFERENCES client (id),
  model       text NOT NULL CHECK (btrim(model) <> ''),
  unit_price  numeric(14, 2) NOT NULL CHECK (unit_price >= 0),
  currency    char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE UNIQUE INDEX sensor_price_active ON sensor_price (client_id, model, currency) WHERE archived_at IS NULL;

CREATE TABLE client_quotation (
  id             uuid PRIMARY KEY,
  client_id      uuid NOT NULL REFERENCES client (id),
  config_id      uuid NOT NULL REFERENCES client_quote_config (id),
  number         text NOT NULL UNIQUE,
  title          text NOT NULL CHECK (btrim(title) <> ''),
  issue_date     date NOT NULL,
  -- [{kind: sensor|installation|other, label, unitPrice, units, subtotal}], computed by the command.
  lines          jsonb NOT NULL CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) > 0),
  standard_hours numeric(8, 1) NOT NULL CHECK (standard_hours >= 0),
  quoted_hours   numeric(8, 1) NOT NULL CHECK (quoted_hours >= 0),
  hours_reason   text,
  currency       char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  subtotal       numeric(14, 2) NOT NULL CHECK (subtotal >= 0),
  tax_mode       text NOT NULL CHECK (tax_mode IN ('reverse_charge', 'ddp_local_vat')),
  vat_amount     numeric(14, 2) NOT NULL CHECK (vat_amount >= 0),
  total          numeric(14, 2) NOT NULL CHECK (total >= 0),
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  -- A person sends it outside OCS and records it here (CLAUDE.md §3 rule 4); OCS never sends.
  sent_by        uuid,
  sent_at        timestamptz,
  created_by     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  archived_at    timestamptz,
  CHECK (quoted_hours = standard_hours OR (hours_reason IS NOT NULL AND btrim(hours_reason) <> '')),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL) AND (sent_at IS NULL) = (sent_by IS NULL))
);
CREATE INDEX client_quotation_client ON client_quotation (client_id);

-- The stores a quotation covers, with the sensors and scope used for the time standard.
CREATE TABLE client_quotation_site (
  quotation_id uuid NOT NULL REFERENCES client_quotation (id),
  client_id    uuid NOT NULL,
  site_id      uuid NOT NULL,
  sensor_count integer NOT NULL CHECK (sensor_count > 0),
  scope        text NOT NULL CHECK (scope IN ('partial', 'full')),
  PRIMARY KEY (quotation_id, site_id),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id)
);

ALTER TABLE client_quote_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_quotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_quotation_site ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_quote_config_internal ON client_quote_config FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
CREATE POLICY sensor_price_internal ON sensor_price FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
CREATE POLICY client_quotation_internal ON client_quotation FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
CREATE POLICY client_quotation_site_internal ON client_quotation_site FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
-- No DELETE: archive with archived_at (SOP-DEL-02 "never delete").
GRANT SELECT, INSERT, UPDATE ON client_quote_config, sensor_price, client_quotation, client_quotation_site TO ocs_app;
