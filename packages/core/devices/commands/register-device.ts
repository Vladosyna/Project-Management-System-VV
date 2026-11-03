// devices.device.register — E4 AC1: a device on a project with SN, MAC, model, firmware, switch/port/IP and
// status. R6: the same SN (any case) or MAC is refused while another active device has it.
import { z } from 'zod';
import { DEVICE_STATUSES } from '@ocs/db';
import { defineCommand, NotFound, ValidationFailed } from '../../kernel/index.ts';
import { normaliseMac } from '../mac.ts';
import { devicesPermissions } from '../permissions.ts';
import { activeDevicesWith, findActiveSite, insertDevice } from '../repository.ts';
import { checkDuplicateSnMac } from '../rules/duplicate-sn-mac.ts';

const text = (max: number) => z.string().trim().min(1).max(max);

export const registerDevice = defineCommand({
  name: 'devices.device.register',
  permission: devicesPermissions.registerDevice,
  input: z.object({
    siteId: z.uuid(),
    sn: text(100),
    /** Any common spelling; stored as AA:BB:CC:DD:EE:FF. */
    mac: text(30).optional(),
    model: text(50),
    firmware: text(50).optional(),
    switchName: text(100).optional(),
    switchPort: text(50).optional(),
    ip: z.union([z.ipv4(), z.ipv6()]).optional(),
    status: z.enum(DEVICE_STATUSES).default('planned'),
  }),
  describe: (i) => `Register device ${i.sn} (${i.model}) on site ${i.siteId}`,
  handle: async (ctx, i) => {
    const mac = i.mac === undefined ? null : (normaliseMac(i.mac) ?? null);
    if (i.mac !== undefined && mac === null) {
      throw new ValidationFailed([{ path: 'mac', message: `"${i.mac}" is not a MAC address` }]);
    }
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    checkDuplicateSnMac({ sn: i.sn, mac, active: await activeDevicesWith(ctx.tx, i.sn, mac) });
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      sn: i.sn,
      mac,
      model: i.model,
      firmware: i.firmware ?? null,
      switchName: i.switchName ?? null,
      switchPort: i.switchPort ?? null,
      ip: i.ip ?? null,
      status: i.status,
      createdAt: ctx.now,
    };
    await insertDevice(ctx.tx, row);
    ctx.emit('devices.device.registered', { deviceId: row.id, siteId: row.siteId, sn: row.sn }, row.clientId);
    return {
      result: { id: row.id, mac },
      audit: { objectType: 'device', objectId: row.id, clientId: row.clientId, before: null, after: row },
    };
  },
});
