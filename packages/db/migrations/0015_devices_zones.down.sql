-- Reverts 0015_devices_zones.
DROP TABLE device_channel;
ALTER TABLE device DROP CONSTRAINT device_id_site;
ALTER TABLE device DROP CONSTRAINT device_offline_since;
ALTER TABLE device DROP COLUMN synced_at;
ALTER TABLE device DROP COLUMN offline_since;
ALTER TABLE device DROP COLUMN platform_status;
DROP TABLE zone;
ALTER TABLE site DROP COLUMN device_alerts_enabled;
DROP INDEX site_platform_ref;
ALTER TABLE site DROP COLUMN platform_ref;
