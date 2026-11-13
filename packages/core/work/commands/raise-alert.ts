// work.alert.raise — actions from automatic alerts (E5 AC1 source "alert"), e.g. R15 "sensor offline > 24 h".
// Each action is owned by its project's PM, due the next day, internal (never shown to the client). One action
// per alert ref: the caller names the episode (R15: device and the time it went offline), so a done action is not
// raised again while the same episode lasts, and a new episode raises a new one. A batch per job run, one audit
// record per run. System only (worker alert jobs).
import { z } from 'zod';
import { defineCommand } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { findSitePm, insertAction, lockAlertAction } from '../repository.ts';

/** Assumption (internal default, no SOP clause): an alert action is due the day after it is raised. */
const DUE_AFTER_DAYS = 1;

export const raiseAlert = defineCommand({
  name: 'work.alert.raise',
  permission: workPermissions.raiseAlert,
  input: z.object({
    alerts: z
      .array(
        z.object({
          siteId: z.uuid(),
          /** Stable per alert episode, e.g. "R15:<deviceId>:<offlineSince ISO>". */
          ref: z.string().trim().min(1).max(300),
          title: z.string().trim().min(1).max(300),
        }),
      )
      .max(1000),
  }),
  describe: (i) => `Raise ${String(i.alerts.length)} alerts as actions`,
  handle: async (ctx, i) => {
    const due = new Date(ctx.now.getTime() + DUE_AFTER_DAYS * 86_400_000).toISOString().slice(0, 10);
    const created: { ref: string; actionId: string }[] = [];
    /** Not raised: the project is gone, or has no PM to own the action — reported, the run goes on. */
    const skipped: { ref: string; reason: 'no_project' | 'no_pm' }[] = [];
    let existing = 0;
    for (const alert of i.alerts) {
      if (await lockAlertAction(ctx.tx, alert.ref)) {
        existing += 1;
        continue;
      }
      const project = await findSitePm(ctx.tx, alert.siteId);
      if (!project) {
        skipped.push({ ref: alert.ref, reason: 'no_project' });
        continue;
      }
      if (project.pmId === null) {
        skipped.push({ ref: alert.ref, reason: 'no_pm' });
        continue;
      }
      const row = {
        id: ctx.newId(),
        clientId: project.clientId,
        siteId: project.id,
        title: alert.title,
        ownerId: project.pmId,
        due,
        sourceKind: 'alert' as const,
        sourceRef: alert.ref,
        visibility: 'internal' as const,
        createdBy: ctx.actor.id,
        createdAt: ctx.now,
      };
      await insertAction(ctx.tx, row);
      ctx.emit(
        'work.action.created',
        { actionId: row.id, siteId: row.siteId, ownerId: row.ownerId, due },
        row.clientId,
      );
      created.push({ ref: alert.ref, actionId: row.id });
    }
    const result = { created, existing, skipped };
    return {
      result,
      audit: { objectType: 'alert_run', objectId: ctx.newId(), clientId: null, before: null, after: result },
    };
  },
});
