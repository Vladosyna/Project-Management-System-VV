// lifecycle.weeklyReport.read — E11 AC1 (D-44 (5)): the Friday report per client, project part: the client's projects
// that changed in one week (Monday 00:00 to next Monday 00:00 UTC) — steps recorded and planned installation dates
// set or moved (read from the audit log). Projects without a change are left out. The commercial part is
// commercial.weeklyChanges.read; cases join once they exist. Assumption: weeks run in UTC.
import { z } from 'zod';
import { addDays, weekday } from '../../calendar/index.ts';
import { defineQuery } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSites, plannedDateChanges, stepsRecordedBetween } from '../repository.ts';

const day = (d: Date) => d.toISOString().slice(0, 10);
const plannedOf = (v: unknown) =>
  (v as { plannedInstallationDate?: string | null } | null)?.plannedInstallationDate ?? null;

export const weeklyReport = defineQuery({
  name: 'lifecycle.weeklyReport.read',
  permission: lifecyclePermissions.weeklyReport,
  input: z.object({
    clientId: z.uuid(),
    weekStart: z.iso.date().refine((d) => weekday(d) === 1, 'a week starts on a Monday'),
  }),
  handle: async (ctx, i) => {
    const from = new Date(`${i.weekStart}T00:00:00Z`);
    const to = new Date(from.getTime() + 7 * 86_400_000);
    const sites = await activeSites(ctx.tx, { clientId: i.clientId });
    const steps = await stepsRecordedBetween(
      ctx.tx,
      sites.map((s) => s.id),
      from,
      to,
    );
    const moves = await plannedDateChanges(ctx.tx, i.clientId, from, to);
    const projects = sites
      .map((s) => ({
        siteId: s.id,
        projectId: s.projectId,
        name: s.name,
        steps: steps
          .filter((st) => st.siteId === s.id)
          .map((st) => ({ step: st.step, doneOn: st.doneOn, recordedOn: day(st.at) })),
        dates: moves
          .filter((m) => m.siteId === s.id)
          .map((m) => ({ from: plannedOf(m.before), to: plannedOf(m.after), changedOn: day(m.at) })),
      }))
      .filter((p) => p.steps.length > 0 || p.dates.length > 0);
    return { weekStart: i.weekStart, weekEnd: addDays(i.weekStart, 6), projects };
  },
});
