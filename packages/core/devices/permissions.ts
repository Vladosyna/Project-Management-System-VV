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
  offlineDue: permission('devices.offline.due', {
    description: 'Devices offline longer than R15 allows on projects with alerts on (system only)',
    roles: ['system'],
  }),
  platformSites: permission('devices.platformSites.read', {
    description: 'Projects linked to a mall on the device platform, with their alerts switch (system only)',
    roles: ['system'],
  }),
  siteDevices: permission('devices.siteDevices.read', {
    description: "See a project's devices: platform status, offline since, the gate each channel counts (E4)",
    roles: ['director', 'pm', 'sales', 'rnd', 'management', 'sponsor'],
  }),
  setVersions: permission('devices.device.setVersions', {
    description: 'Set firmware and algorithm version on devices of a project (D-31)',
    roles: ['director', 'pm', 'rnd'],
  }),
  recordFirmwareIssue: permission('devices.firmwareIssue.record', {
    description: 'Record a known problem of a firmware version of a model (D-31, R&D reference)',
    roles: ['director', 'rnd'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
