-- Reverts 0017_firmware_issues.
DROP TABLE firmware_issue;
ALTER TABLE device DROP COLUMN algorithm_version;
