// devices — Devices registry: every camera and box per site with SN, MAC, model, firmware, network and status (E4)
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { devicesPermissions } from './permissions.ts';
export { registerDevice } from './commands/register-device.ts';
