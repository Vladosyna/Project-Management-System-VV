// intake.register.read — E2 AC6, SOP-DEL-01 §12: "The Delivery Director logs every submission: Project ID, date
// submitted, decision, days to acceptance, number of returns. Reviewed monthly with the Sales Lead." One row per
// submitted card version, optionally for one month of submissions. Days to acceptance: working days from the
// project's first submission to its acceptance (project country calendar, GB fallback — as in E3).
import { z } from 'zod';
import { calendarOfCountry, localDateIn, workingDaysBetween } from '../../calendar/index.ts';
import { defineQuery } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import { submissions } from '../repository.ts';

const day = (d: Date) => localDateIn(d, 'UTC');

export const intakeRegister = defineQuery({
  name: 'intake.register.read',
  permission: intakePermissions.intakeRegister,
  input: z.object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
  }),
  handle: async (ctx, i) => {
    const all = await submissions(ctx.tx);
    const firstOf = new Map<string, Date>();
    for (const s of all) if (s.submittedAt && !firstOf.has(s.siteId)) firstOf.set(s.siteId, s.submittedAt);
    return all
      .flatMap((s) => {
        const submitted = s.submittedAt;
        if (!submitted) return [];
        // D-35: a return the sponsor overturned counts as accepted on the day of the sponsor's decision.
        const overturned = s.decision === 'returned' && s.disputeOutcome === 'overturned';
        const decision = overturned ? 'accepted' : s.decision;
        const decidedAt = overturned ? s.disputeDecidedAt : s.decidedAt;
        const accepted = decision === 'accepted' || decision === 'accepted_with_conditions';
        const first = firstOf.get(s.siteId) ?? submitted;
        const row = {
          projectId: s.projectId,
          version: s.version,
          submittedOn: day(submitted),
          decision: decision ?? 'pending',
          decidedOn: decidedAt ? day(decidedAt) : null,
          /** Returns before this submission: every earlier version came back. */
          returns: s.version - 1,
          daysToAcceptance:
            accepted && decidedAt
              ? workingDaysBetween(day(first), day(decidedAt), calendarOfCountry(s.countryCode))
              : null,
        };
        return [row];
      })
      .filter((r) => i.month === undefined || r.submittedOn.startsWith(i.month));
  },
});
