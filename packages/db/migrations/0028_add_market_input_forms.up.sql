-- 0028_add_market_input_forms — additive and reversible (ocs-db-migration); never edit once on main.
-- MI-1 (D-37, docs/ocs/market-input-in-ocs.md §1): Market Input as a form per store. Fields are rows (Vlad, 28 Nov:
-- form_field table, not jsonb). Revisions (MI-2) and attachments (MI-6, D-46 files) follow. Internal only for now:
-- the country-scoped market link gets its own policy with MI-3, after the security review (03 §7).

-- A template: base (client_id NULL) or a client's, optionally narrowed to a programme or country (as D-32).
CREATE TABLE form_template (
  id            uuid PRIMARY KEY,
  client_id     uuid REFERENCES client (id),
  programme_id  uuid REFERENCES programme (id),
  country_code  text CHECK (country_code ~ '^[A-Z]{2}$'),
  name          text NOT NULL CHECK (btrim(name) <> ''),
  version       integer NOT NULL CHECK (version > 0),
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  CHECK (client_id IS NOT NULL OR (programme_id IS NULL AND country_code IS NULL)),
  UNIQUE (name, version)
);

CREATE TABLE form_field (
  id            uuid PRIMARY KEY,
  template_id   uuid NOT NULL REFERENCES form_template (id),
  key           text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{0,59}$'),
  section       text NOT NULL CHECK (section ~ '^[A-C][0-9]{0,2}$'),
  sort_order    integer NOT NULL,
  label_en      text NOT NULL CHECK (btrim(label_en) <> ''),
  label_zh      text NOT NULL CHECK (btrim(label_zh) <> ''),
  type          text NOT NULL CHECK (type IN ('text', 'email', 'date', 'date_window', 'number', 'enum', 'yes_no_tbc',
                  'attachment_slot', 'checklist_item')),
  requirement   text NOT NULL CHECK (requirement IN ('required', 'optional', 'conditional')),
  answered_by   text NOT NULL CHECK (answered_by IN ('market', 'vionvision')),
  -- enum options, condition ({field, equals}), guidance EN/中文, due offset (C: D-20, D-2, before calibration).
  options       jsonb CHECK (options IS NULL OR jsonb_typeof(options) = 'array'),
  condition     jsonb CHECK (condition IS NULL OR jsonb_typeof(condition) = 'object'),
  guidance_en   text,
  guidance_zh   text,
  due_offset    text CHECK (due_offset IN ('d_minus_20', 'd_minus_2', 'before_calibration')),
  version       integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz
);
CREATE UNIQUE INDEX form_field_active_key ON form_field (template_id, key) WHERE archived_at IS NULL;

-- Per client × country batch (site_id NULL) or per store: switch a field off or on, or change its requirement.
CREATE TABLE form_field_override (
  id            uuid PRIMARY KEY,
  client_id     uuid NOT NULL REFERENCES client (id),
  country_code  text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  site_id       uuid,
  field_id      uuid NOT NULL REFERENCES form_field (id),
  action        text NOT NULL CHECK (action IN ('disable', 'enable', 'change')),
  requirement   text CHECK (requirement IN ('required', 'optional', 'conditional')),
  reason        text NOT NULL CHECK (btrim(reason) <> ''),
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  CHECK ((action = 'change') = (requirement IS NOT NULL)),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id)
);
CREATE INDEX form_field_override_batch ON form_field_override (client_id, country_code) WHERE archived_at IS NULL;

-- One request per store and template version.
CREATE TABLE form_request (
  id                uuid PRIMARY KEY,
  client_id         uuid NOT NULL,
  site_id           uuid NOT NULL,
  template_id       uuid NOT NULL REFERENCES form_template (id),
  due_on            date,
  status            text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'ready',
                      'submitted', 'reviewed', 'returned', 'changed_review_needed')),
  current_revision  integer NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  archived_at       timestamptz,
  UNIQUE (id, client_id),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id)
);
CREATE UNIQUE INDEX form_request_active ON form_request (site_id, template_id) WHERE archived_at IS NULL;

-- An answer is never overwritten: a new one supersedes it (history on click).
CREATE TABLE form_answer (
  id             uuid PRIMARY KEY,
  client_id      uuid NOT NULL,
  request_id     uuid NOT NULL,
  field_id       uuid NOT NULL REFERENCES form_field (id),
  value          jsonb NOT NULL,
  answered_by    uuid NOT NULL,
  answered_via   text NOT NULL CHECK (answered_via IN ('link', 'excel', 'agent', 'staff')),
  answered_at    timestamptz NOT NULL DEFAULT now(),
  superseded_at  timestamptz,
  FOREIGN KEY (request_id, client_id) REFERENCES form_request (id, client_id)
);
CREATE UNIQUE INDEX form_answer_current ON form_answer (request_id, field_id) WHERE superseded_at IS NULL;

CREATE TABLE form_comment (
  id           uuid PRIMARY KEY,
  client_id    uuid NOT NULL,
  request_id   uuid NOT NULL,
  field_id     uuid NOT NULL REFERENCES form_field (id),
  side         text NOT NULL CHECK (side IN ('market', 'vionvision')),
  body         text NOT NULL CHECK (btrim(body) <> ''),
  author_id    uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  archived_at  timestamptz,
  FOREIGN KEY (request_id, client_id) REFERENCES form_request (id, client_id)
);
CREATE INDEX form_comment_request ON form_comment (request_id) WHERE archived_at IS NULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['form_template', 'form_field', 'form_field_override', 'form_request', 'form_answer',
                           'form_comment'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO ocs_app USING (app.is_internal()) WITH CHECK (app.is_internal())',
                   t || '_internal', t);
    -- No DELETE: archive or supersede (SOP-DEL-02 "never delete").
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO ocs_app', t);
  END LOOP;
END $$;
