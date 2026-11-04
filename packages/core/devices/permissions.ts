// devices permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const devicesPermissions = {
  registerDevice: permission('devices.device.register', {
    description: 'Register a device on a project: SN, MAC, model, firmware, network, status (E4 AC1)',
    roles: ['director', 'pm', 'rnd'],
  }),
  syncZones: permission('devices.zones.sync', {
    description: 'Sync zones',
    roles: [],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
