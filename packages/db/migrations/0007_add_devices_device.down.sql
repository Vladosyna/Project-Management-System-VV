-- Reverts 0007_add_devices_device.
DROP TABLE device;
ALTER TABLE site DROP CONSTRAINT site_id_client;
