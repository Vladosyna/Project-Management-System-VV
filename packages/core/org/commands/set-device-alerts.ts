// org.site.setDeviceAlerts — E4 (Vlad, 3 Nov): a project is linked to its mall on the device platform, and
// its offline alerts are switched on or off by a checkbox (off by default, so a mall not live yet raises
// nothing). Alerts need a linked mall; one mall belongs to one active project.
import { z } from 'zod';
import { Conflict, defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { lockActiveSite, setSiteDevicePlatform, siteLinkedTo } from '../repository.ts';

export const setDeviceAlerts = defineCommand({
  name: 'org.site.setDeviceAlerts',
  permission: orgPermissions.setDeviceAlerts,
  input: z.object({
    siteId: z.uuid(),
    /** The mall's plazaUnid on the device platform; null unlinks. */
    platformRef: z.string().trim().min(1).max(100).nullable(),
    alertsEnabled: z.boolean(),
  }),
  describe: (i) =>
    `Set device platform link and alerts (${i.alertsEnabled ? 'on' : 'off'}) of site ${i.siteId}`,
  handle: async (ctx, i) => {
    const current = await lockActiveSite(ctx.tx, i.siteId);
    if (!current) throw new NotFound('site', i.siteId);
    if (i.alertsEnabled && i.platformRef === null) {
      throw new RuleViolation('E4 (Vlad, 3 Nov 2026)', 'offline alerts need the project linked to its mall');
    }
    if (i.platformRef !== null) {
      const other = await siteLinkedTo(ctx.tx, i.platformRef, current.id);
      if (other) throw new Conflict(`this mall is already linked to ${other.projectId}`);
    }
    const after = { platformRef: i.platformRef, deviceAlertsEnabled: i.alertsEnabled };
    await setSiteDevicePlatform(ctx.tx, current.id, after);
    ctx.emit('org.site.deviceAlertsSet', { siteId: current.id, ...after }, current.clientId);
    return {
      result: after,
      audit: {
        objectType: 'site',
        objectId: current.id,
        clientId: current.clientId,
        before: { platformRef: current.platformRef, deviceAlertsEnabled: current.deviceAlertsEnabled },
        after,
      },
    };
  },
});
