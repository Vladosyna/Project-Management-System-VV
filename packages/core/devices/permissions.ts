// devices permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const devicesPermissions = {
  registerDevice: permission('devices.device.register', {
    description: 'Register a device on a project: SN, MAC, model, firmware, network, status (E4 AC1)',
    roles: ['director', 'pm', 'rnd'],
  }),
  syncDevices: permission('devices.platform.syncDevices', {
    description:
      "Sync a project's devices and their online status from the device platform (system only, E4, D-29)",
    roles: ['system'],
  }),
  syncZones: permission('devices.platform.syncZones', {
    description: "Sync a project's zones (stores, areas, gates) from the device platform (system only, E4)",
    roles: ['system'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
