// devices.siteDevices.read — a project's devices for the site page (E4): delivery status, what the platform
// last said, since when it is offline, whether it was registered in OCS by SN, and the gate each channel counts.
// Staff only (RLS and the permission); MAC and IP are internal.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { devicesPermissions } from '../permissions.ts';
import { siteDevicesWithGates } from '../repository.ts';

export const siteDevices = defineQuery({
  name: 'devices.siteDevices.read',
  permission: devicesPermissions.siteDevices,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const { devices, channels } = await siteDevicesWithGates(ctx.tx, i.siteId);
    return devices.map((d) => ({
      id: d.id,
      sn: d.sn,
      model: d.model,
      mac: d.mac,
      ip: d.ip,
      switchName: d.switchName,
      switchPort: d.switchPort,
      status: d.status,
      platformStatus: d.platformStatus,
      offlineSince: d.offlineSince?.toISOString() ?? null,
      syncedAt: d.syncedAt?.toISOString() ?? null,
      registered: d.registeredAt !== null,
      channels: channels.filter((c) => c.deviceId === d.id).map((c) => ({ no: c.channelNo, gate: c.gate })),
    }));
  },
});
