// devices.offline.due — R15: devices offline longer than the rule allows on projects whose alerts are on. The
// worker reads this on a schedule and raises one action per offline episode (work.alert.raise). System only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { devicesPermissions } from '../permissions.ts';
import { offlineDevicesSince } from '../repository.ts';
import { isOfflineAlertDue, offlineAlertCutoff } from '../rules/offline-alert.ts';

export interface OfflineDueDevice {
  readonly deviceId: string;
  readonly sn: string;
  readonly siteId: string;
  readonly projectId: string;
  readonly pmId: string | null;
  readonly offlineSince: Date;
}

export const offlineDue = defineQuery({
  name: 'devices.offline.due',
  permission: devicesPermissions.offlineDue,
  input: z.object({}),
  handle: async (ctx): Promise<OfflineDueDevice[]> => {
    const rows = await offlineDevicesSince(ctx.tx, offlineAlertCutoff(ctx.now));
    return rows.flatMap((r) =>
      r.offlineSince !== null && isOfflineAlertDue(r, ctx.now)
        ? [
            {
              deviceId: r.deviceId,
              sn: r.sn,
              siteId: r.siteId,
              projectId: r.projectId,
              pmId: r.pmId,
              offlineSince: r.offlineSince,
            },
          ]
        : [],
    );
  },
});
