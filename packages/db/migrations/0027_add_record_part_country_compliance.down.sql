-- Reverts 0027_add_record_part_country_compliance.
DROP TABLE country_compliance;
ALTER TABLE client DROP COLUMN compliance_scope;
ALTER TABLE client_quotation DROP COLUMN part;
ALTER TABLE commercial_record DROP COLUMN part;
