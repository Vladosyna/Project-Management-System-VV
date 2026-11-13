// work.alert.resolve — withdraws the actions of alerts that cleared on their own (Vlad, 4 Nov: a device back
// online, its R15 action can go). Only open or in-progress actions are withdrawn (status cancelled, never
// deleted); done ones stay as they are. The reason goes to the audit record and the event. System only.
import { z } from 'zod';
import { defineCommand } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { cancelOpenAlertActions } from '../repository.ts';

export const resolveAlert = defineCommand({
  name: 'work.alert.resolve',
  permission: workPermissions.resolveAlert,
  input: z.object({
    /** The alert refs raised with work.alert.raise, e.g. "R15:<deviceId>:<offlineSince ISO>". */
    refs: z.array(z.string().trim().min(1).max(300)).max(1000),
    /**
     * A summary alert that is replaced when its content changes, e.g. reconciliation "RECON:<siteId>:": withdraw
     * every open action whose ref starts with `prefix`, except `keep` (the current one, or null when none is due).
     */
    superseded: z
      .object({
        prefix: z.string().trim().min(3).max(200),
        keep: z.string().trim().min(1).max(300).nullable(),
      })
      .optional(),
    reason: z.string().trim().min(1).max(300),
  }),
  describe: (i) => `Withdraw ${String(i.refs.length)} cleared alerts: ${i.reason}`,
  handle: async (ctx, i) => {
    const withdrawn = await cancelOpenAlertActions(ctx.tx, [...new Set(i.refs)], i.superseded);
    for (const a of withdrawn) {
      ctx.emit('work.action.cancelled', { actionId: a.id, siteId: a.siteId, reason: i.reason }, a.clientId);
    }
    const result = { withdrawn: withdrawn.map((a) => ({ ref: a.ref, actionId: a.id })) };
    return {
      result,
      audit: {
        objectType: 'alert_run',
        objectId: ctx.newId(),
        clientId: null,
        before: null,
        after: { ...result, reason: i.reason },
      },
    };
  },
});
