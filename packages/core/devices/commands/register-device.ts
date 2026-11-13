// devices.device.register — E4 AC1: a device on a project with SN, MAC, model, firmware, switch/port/IP and
// status. R6: the same SN (any case) is refused while another active device has it. The MAC is stored but not
// checked: it can change on restart (D-29).
import { z } from 'zod';
import { defineCommand, NotFound, ValidationFailed } from '../../kernel/index.ts';
import { normaliseMac } from '../mac.ts';
import { devicesPermissions } from '../permissions.ts';
import {
  activeDevicesWithSn,
  confirmDevice,
  DEVICE_STATUSES,
  findActiveSite,
  insertDevice,
} from '../repository.ts';
import { checkDuplicateSn } from '../rules/duplicate-sn.ts';

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
    const active = await activeDevicesWithSn(ctx.tx, i.sn);
    // Reconciliation (Vlad, 4 Nov): the platform already brought this SN in on this project and nobody had
    // registered it — registering it confirms that device instead of adding a duplicate.
    const fromPlatform = active.find((d) => d.siteId === project.id && d.registeredAt === null);
    if (fromPlatform) {
      const values = {
        model: i.model,
        status: i.status,
        registeredAt: ctx.now,
        ...(mac === null ? {} : { mac }),
        ...(i.firmware === undefined ? {} : { firmware: i.firmware }),
        ...(i.switchName === undefined ? {} : { switchName: i.switchName }),
        ...(i.switchPort === undefined ? {} : { switchPort: i.switchPort }),
        ...(i.ip === undefined ? {} : { ip: i.ip }),
      };
      await confirmDevice(ctx.tx, fromPlatform.id, values);
      ctx.emit(
        'devices.device.registered',
        { deviceId: fromPlatform.id, siteId: project.id, sn: i.sn },
        project.clientId,
      );
      return {
        result: { id: fromPlatform.id, mac },
        audit: {
          objectType: 'device',
          objectId: fromPlatform.id,
          clientId: project.clientId,
          before: null,
          after: values,
        },
      };
    }
    checkDuplicateSn({ sn: i.sn, active });
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
      registeredAt: ctx.now,
    };
    await insertDevice(ctx.tx, row);
    ctx.emit('devices.device.registered', { deviceId: row.id, siteId: row.siteId, sn: row.sn }, row.clientId);
    return {
      result: { id: row.id, mac },
      audit: { objectType: 'device', objectId: row.id, clientId: row.clientId, before: null, after: row },
    };
  },
});
