-- 0029_add_stored_file_dingtalk_upload — additive and reversible (ocs-db-migration); never edit once on main.
-- D-46: a file attached in OCS (proposal, client PO, invoice, quotation, drawing, Market Input) is kept in EU object
-- storage first — never inline in the database (03 §7) — with hash, size, type and version. After a person confirms
-- it, an upload request puts it into the DingTalk project folder by SOP-DEL-02 (worker, organisation app). Internal only.
CREATE TABLE stored_file (
  id             uuid PRIMARY KEY,
  client_id      uuid NOT NULL REFERENCES client (id),
  site_id        uuid,
  -- What the file belongs to; the owning module checks the id.
  owner_type     text NOT NULL CHECK (owner_type IN ('site_proposal', 'commercial_record', 'client_quotation',
                   'country_compliance', 'form_request', 'form_answer', 'drawing', 'other')),
  owner_id       uuid,
  -- SOP-DEL-02 folder (L) or slot prefix (S), e.g. '01' commercial, '02' site information.
  sop_folder     text NOT NULL CHECK (sop_folder ~ '^(0[0-9]|1[01])$'),
  -- EU storage key; NULL for a file indexed from DingTalk that stays only there (D-09: originals stay in DingTalk).
  object_key     text UNIQUE CHECK (btrim(object_key) <> ''),
  -- The file in DingTalk Drive: after an upload, or when found by the audit of existing folders. Opens by link.
  dingtalk_space_id  text,
  dingtalk_dentry_id text UNIQUE,
  dingtalk_url   text CHECK (dingtalk_url ~ '^https://'),
  sha256         text CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes     bigint NOT NULL CHECK (size_bytes > 0),
  mime_type      text NOT NULL,
  original_name  text NOT NULL CHECK (btrim(original_name) <> ''),
  version        integer NOT NULL DEFAULT 1 CHECK (version > 0),
  -- A new version supersedes the previous file of the same owner; the old one is archived, never deleted.
  supersedes_id  uuid REFERENCES stored_file (id),
  uploaded_by    uuid NOT NULL,
  uploaded_via   text NOT NULL CHECK (uploaded_via IN ('web', 'ai', 'market_link', 'mail', 'dingtalk_audit')),
  source_ref     text,
  -- D-46 (2): a person confirms the file before it may go to DingTalk.
  confirmed_by   uuid,
  confirmed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  archived_at    timestamptz,
  UNIQUE (id, client_id),
  FOREIGN KEY (site_id, client_id) REFERENCES site (id, client_id),
  CHECK ((confirmed_by IS NULL) = (confirmed_at IS NULL)),
  -- Stored in the EU (with its hash) or known in DingTalk — at least one place.
  CHECK ((object_key IS NOT NULL AND sha256 IS NOT NULL) OR dingtalk_dentry_id IS NOT NULL)
);
CREATE INDEX stored_file_owner ON stored_file (owner_type, owner_id) WHERE archived_at IS NULL;
CREATE INDEX stored_file_site ON stored_file (site_id) WHERE archived_at IS NULL;

-- D-46 (2): one upload to DingTalk per file, requested by a person; the worker retries and records the result.
CREATE TABLE dingtalk_upload (
  id            uuid PRIMARY KEY,
  client_id     uuid NOT NULL,
  file_id       uuid NOT NULL UNIQUE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'failed')),
  requested_by  uuid NOT NULL,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  -- Folder path the worker resolved by SOP-DEL-02, and what DingTalk returned.
  folder_path   text,
  dentry_id     text,
  dentry_version text,
  attempts      integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error    text,
  uploaded_at   timestamptz,
  FOREIGN KEY (file_id, client_id) REFERENCES stored_file (id, client_id),
  CHECK ((status = 'uploaded') = (dentry_id IS NOT NULL AND uploaded_at IS NOT NULL))
);
CREATE INDEX dingtalk_upload_pending ON dingtalk_upload (requested_at) WHERE status = 'pending';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stored_file', 'dingtalk_upload'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO ocs_app USING (app.is_internal()) WITH CHECK (app.is_internal())',
                   t || '_internal', t);
    -- No DELETE: archive (SOP-DEL-02 "never delete").
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO ocs_app', t);
  END LOOP;
END $$;
