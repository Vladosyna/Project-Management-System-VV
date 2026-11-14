-- Reverts 0019_gate_template_scope.
DROP INDEX gate_template_active_scope;
ALTER TABLE gate_template DROP CONSTRAINT gate_template_scope;
ALTER TABLE gate_template DROP COLUMN updated_by;
ALTER TABLE gate_template DROP COLUMN country_code;
DELETE FROM gate_template WHERE client_id IS NULL;
ALTER TABLE gate_template ALTER COLUMN client_id SET NOT NULL;
