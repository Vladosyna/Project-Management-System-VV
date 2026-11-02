-- Reverts 0005_add_org_programme.
ALTER TABLE site DROP COLUMN programme_id;
DROP TABLE programme;
