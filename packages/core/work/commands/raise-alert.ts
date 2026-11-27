// work.alert.raise — actions from automatic alerts (E5 AC1 source "alert"), e.g. R15 "sensor offline > 24 h".
// Each action is owned by its project's PM (or the owner the alert names), due by the alert's level (domain/rules.md,
// D-38: P0 same day, P1 within 2 working days, P2 within the week — the project's country calendar, GB where there is
// none), internal (never shown to the client). One action
// per alert ref: the caller names the episode (R15: device and the time it went offline), so a done action is not
// raised again while the same episode lasts, and a new episode raises a new one. A batch per job run, one audit
// record per run. System only (worker alert jobs).
import { z } from 'zod';
import { addWorkingDays, calendarIds, localDateIn, type CalendarId } from '../../calendar/index.ts';
import { defineCommand } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { findSitePm, insertAction, lockAlertAction } from '../repository.ts';

/** domain/rules.md levels: working days until the action is due (P2 "within the week" = 5 working days). */
const WORKING_DAYS = { P0: 0, P1: 2, P2: 5 } as const;
const calendarOf = (country: string): CalendarId =>
  (calendarIds as readonly string[]).includes(country) ? (country as CalendarId) : 'GB';

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
          /** The rule's level in domain/rules.md; sets the due date. */
          level: z.enum(['P0', 'P1', 'P2']),
          /** Owner other than the project's PM, e.g. Sales owner and director for an expired intake condition. */
          ownerId: z.uuid().optional(),
          /**
           * domain/rules.md level: P0 same day, P1 within 2 working days, P2 within the week. Vlad, 27 Nov: alert
           * jobs pass the level and never a due date; the shared due-by-level fix (all rules at once) reads it.
           * Until then the due date stays the next day for every level.
           */
          level: z.enum(['P0', 'P1', 'P2']).optional(),
        }),
      )
      .max(1000),
  }),
  describe: (i) => `Raise ${String(i.alerts.length)} alerts as actions`,
  handle: async (ctx, i) => {
    const today = localDateIn(ctx.now, 'UTC');
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
      const ownerId = alert.ownerId ?? project.pmId;
      if (ownerId === null) {
        skipped.push({ ref: alert.ref, reason: 'no_pm' });
        continue;
      }
      const days = WORKING_DAYS[alert.level];
      const due = days === 0 ? today : addWorkingDays(today, days, calendarOf(project.countryCode));
      const row = {
        id: ctx.newId(),
        clientId: project.clientId,
        siteId: project.id,
        title: alert.title,
        ownerId,
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
