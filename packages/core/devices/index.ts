// devices — Devices registry: every camera and box per site with SN, MAC, model, firmware, network and status (E4)
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { devicesPermissions } from './permissions.ts';
export { registerDevice } from './commands/register-device.ts';
export { syncDevices } from './commands/sync-devices.ts';
export { syncZones } from './commands/sync-zones.ts';
export { offlineDue } from './queries/offline-due.ts';
export { platformSites } from './queries/platform-sites.ts';
