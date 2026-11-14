// devices.device.setVersions — D-31: firmware and algorithm version of devices of one project, entered by hand
// (PM, R&D) until the device platform documents them. Many devices at once; the audit record keeps each device's
// old values (the change log of the Site mockup).
import { z } from 'zod';
import { defineCommand, NotFound, ValidationFailed } from '../../kernel/index.ts';
import { devicesPermissions } from '../permissions.ts';
import { activeDevicesOfSite, setDeviceVersions } from '../repository.ts';

const version = z.string().trim().min(1).max(100);

export const setVersions = defineCommand({
  name: 'devices.device.setVersions',
  permission: devicesPermissions.setVersions,
  input: z
    .object({
      siteId: z.uuid(),
      deviceIds: z.array(z.uuid()).min(1).max(1000),
      firmware: version.optional(),
      algorithmVersion: version.optional(),
    })
    .refine(
      (i) => i.firmware !== undefined || i.algorithmVersion !== undefined,
      'give a firmware or an algorithm version',
    ),
  describe: (i) => `Set versions on ${String(i.deviceIds.length)} devices of site ${i.siteId}`,
  handle: async (ctx, i) => {
    const ids = [...new Set(i.deviceIds)];
    const found = await activeDevicesOfSite(ctx.tx, i.siteId, ids);
    if (found.length === 0) throw new NotFound('device', ids[0] ?? '');
    if (found.length !== ids.length) {
      throw new ValidationFailed([
        { path: 'deviceIds', message: 'every device must be active on this project' },
      ]);
    }
    const values = {
      ...(i.firmware === undefined ? {} : { firmware: i.firmware }),
      ...(i.algorithmVersion === undefined ? {} : { algorithmVersion: i.algorithmVersion }),
    };
    await setDeviceVersions(ctx.tx, ids, values);
    return {
      result: { updated: ids.length },
      audit: {
        objectType: 'site',
        objectId: i.siteId,
        clientId: found[0]?.clientId ?? null,
        before: found.map(({ id, firmware, algorithmVersion }) => ({ id, firmware, algorithmVersion })),
        after: values,
      },
    };
  },
});
