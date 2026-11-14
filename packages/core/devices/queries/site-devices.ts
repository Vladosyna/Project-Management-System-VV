// devices.siteDevices.read — a project's devices for the site page (E4): delivery status, what the platform
// last said, since when it is offline, whether it was registered in OCS by SN, and the gate each channel counts.
// Staff only (RLS and the permission); MAC and IP are internal.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { devicesPermissions } from '../permissions.ts';
import { activeFirmwareIssues, siteDevicesWithGates } from '../repository.ts';

export const siteDevices = defineQuery({
  name: 'devices.siteDevices.read',
  permission: devicesPermissions.siteDevices,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const { devices, channels } = await siteDevicesWithGates(ctx.tx, i.siteId);
    const issues = await activeFirmwareIssues(ctx.tx);
    return devices.map((d) => ({
      id: d.id,
      sn: d.sn,
      model: d.model,
      mac: d.mac,
      ip: d.ip,
      switchName: d.switchName,
      switchPort: d.switchPort,
      firmware: d.firmware,
      algorithmVersion: d.algorithmVersion,
      /** D-31: known problems of this model (any case) and firmware. */
      firmwareIssues: issues
        .filter((x) => x.firmware === d.firmware && x.model.toUpperCase() === d.model.toUpperCase())
        .map((x) => ({ id: x.id, summary: x.summary, severity: x.severity, source: x.source })),
      status: d.status,
      platformStatus: d.platformStatus,
      offlineSince: d.offlineSince?.toISOString() ?? null,
      syncedAt: d.syncedAt?.toISOString() ?? null,
      registered: d.registeredAt !== null,
      channels: channels.filter((c) => c.deviceId === d.id).map((c) => ({ no: c.channelNo, gate: c.gate })),
    }));
  },
});
