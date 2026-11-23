-- 0022_add_commercial_record — additive and reversible (ocs-db-migration); never edit once on main.
-- D-34 N2 (E13): commercial status per site — client PO, DPIA, client invoice, price-list price. Money is kept in
-- the original currency and in EUR with the rate used (Vlad 23 Nov: "original + euro"). Data comes from an AI agent
-- or a person; a row is a proposal until a PM confirms it (08-ai-and-mcp, money data is never applied unconfirmed).
-- Internal only: no client or partner policy.
CREATE TABLE commercial_record (
  id           uuid PRIMARY KEY,
  client_id    uuid NOT NULL,
  site_id      uuid NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('client_po', 'dpia', 'client_invoice', 'price_list')),
  -- PO or invoice number; empty for DPIA and price list.
  reference    text CHECK (reference IS NULL OR btrim(reference) <> ''),
  -- dpia: pending | approved | rejected; client_invoice: issued | paid; client_po, price_list: received.
  status       text NOT NULL,
  record_date  date NOT NULL,
  amount       numeric(14, 2) CHECK (amount IS NULL OR amount >= 0),
  currency     char(3) CHECK (currency ~ '^[A-Z]{3}$'),
  eur_amount   numeric(14, 2) CHECK (eur_amount IS NULL OR eur_amount >= 0),
  -- EUR per 1 unit of currency, its date and where it came from.
  fx_rate      numeric(14, 6) CHECK (fx_rate IS NULL OR fx_rate > 0),
  fx_date      date,
  fx_source    text CHECK (fx_source IN ('manual', 'agent', 'ecb')),
  source_ref   text,
  proposed_by  uuid NOT NULL,
  proposed_via text NOT NULL CHECK (proposed_via IN ('web', 'ai')),
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  archived_at  timestamptz,
  CHECK (
    (kind = 'dpia' AND status IN ('pending', 'approved', 'rejected') AND amount IS NULL) OR
    (kind = 'client_invoice' AND status IN ('issued', 'paid') AND reference IS NOT NULL) OR
    (kind = 'client_po' AND status = 'received' AND reference IS NOT NULL) OR
    (kind = 'price_list' AND status = 'received' AND amount IS NOT NULL)
  ),
  -- An amount always carries its currency, its EUR value and the rate used.
  CHECK (
    (amount IS NULL AND currency IS NULL AND eur_amount IS NULL AND fx_rate IS NULL AND fx_date IS NULL
      AND fx_source IS NULL) OR
    (amount IS NOT NULL AND currency IS NOT NULL AND eur_amount IS NOT NULL AND fx_rate IS NOT NULL
      AND fx_date IS NOT NULL AND fx_source IS NOT NULL AND (currency <> 'EUR' OR fx_rate = 1))
  ),
  CHECK ((confirmed_by IS NULL) = (confirmed_at IS NULL)),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id)
);
CREATE INDEX commercial_record_site ON commercial_record (site_id, kind) WHERE archived_at IS NULL;
CREATE INDEX commercial_record_client ON commercial_record (client_id);
-- One active PO / invoice number per client (R13 "site in two POs" checks across sites, not here).
CREATE UNIQUE INDEX commercial_record_reference ON commercial_record (client_id, kind, reference)
  WHERE archived_at IS NULL AND reference IS NOT NULL AND kind = 'client_invoice';

ALTER TABLE commercial_record ENABLE ROW LEVEL SECURITY;
CREATE POLICY commercial_record_internal ON commercial_record FOR ALL TO ocs_app
  USING (app.is_internal()) WITH CHECK (app.is_internal());
-- No DELETE: archive with archived_at (SOP-DEL-02 "never delete").
GRANT SELECT, INSERT, UPDATE ON commercial_record TO ocs_app;
