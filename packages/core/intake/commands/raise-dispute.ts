// intake.dispute.raise — E2 AC5, SOP-DEL-01 §9: "If Sales disagrees with a Returned decision, the Sales Lead
// escalates to [the sponsor], who decides within 2 working days. Work does not start while the dispute is open."
// On the project's latest card, which must be Returned; one dispute per return. Working days follow the project's
// country calendar (GB where none exists yet), as everywhere in intake.
import { z } from 'zod';
import { addWorkingDays, calendarOfCountry, localDateIn } from '../../calendar/index.ts';
import { Conflict, defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import { decisionOf, disputeOf, insertDispute, latestCard, lockActiveSite } from '../repository.ts';

const SPONSOR_WORKING_DAYS = 2;
export const raiseDispute = defineCommand({
  name: 'intake.dispute.raise',
  permission: intakePermissions.raiseDispute,
  input: z.object({ siteId: z.uuid(), reason: z.string().trim().min(1).max(2000) }),
  describe: (i) => `Dispute the intake return of site ${i.siteId}`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const card = await latestCard(ctx.tx, project.id);
    const decision = card ? await decisionOf(ctx.tx, card.id) : null;
    if (!card || decision?.decision !== 'returned') {
      throw new RuleViolation('SOP-DEL-01 §9', 'only a Returned decision can be disputed');
    }
    if (await disputeOf(ctx.tx, decision.id)) throw new Conflict('this return is already disputed');
    const dueOn = addWorkingDays(
      localDateIn(ctx.now, 'UTC'),
      SPONSOR_WORKING_DAYS,
      calendarOfCountry(project.countryCode),
    );
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      decisionId: decision.id,
      reason: i.reason,
      raisedBy: ctx.actor.id,
      raisedAt: ctx.now,
      dueOn,
      createdAt: ctx.now,
    };
    await insertDispute(ctx.tx, row);
    ctx.emit('intake.dispute.raised', { siteId: project.id, disputeId: row.id, dueOn }, project.clientId);
    return {
      result: { id: row.id, dueOn },
      audit: {
        objectType: 'intake_dispute',
        objectId: row.id,
        clientId: project.clientId,
        before: null,
        after: row,
      },
    };
  },
});
