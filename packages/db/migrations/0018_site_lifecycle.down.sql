-- Reverts 0018_site_lifecycle.
DROP TABLE site_step;
ALTER TABLE site DROP COLUMN planned_installation_date;
ALTER TABLE site DROP COLUMN gate_template_id;
DROP TABLE gate_template;
