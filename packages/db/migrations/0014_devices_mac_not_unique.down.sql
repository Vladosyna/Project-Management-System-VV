-- Reverts 0014_devices_mac_not_unique.
COMMENT ON COLUMN device.mac IS NULL;
DROP INDEX device_mac;
CREATE UNIQUE INDEX device_active_mac ON device (mac) WHERE archived_at IS NULL AND mac IS NOT NULL;
