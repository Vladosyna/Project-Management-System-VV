// intake.dispute.decide — E2 AC5, SOP-DEL-01 §9: the sponsor decides the open dispute on the project's latest
// return. upheld: the return stands, Sales completes the card as usual. overturned: recorded for the audit and the
// Intake Register; Sales resubmits at once and the Delivery Director re-reviews (§5 step 4, re-review: 1 working
// day). A decision is final.
import { z } from 'zod';
import { Conflict, defineCommand, NotFound } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import { latestDisputeOnSite, lockActiveSite, recordDisputeOutcome } from '../repository.ts';

export const decideDispute = defineCommand({
  name: 'intake.dispute.decide',
  permission: intakePermissions.decideDispute,
  input: z.object({
    siteId: z.uuid(),
    outcome: z.enum(['upheld', 'overturned']),
    note: z.string().trim().min(1).max(2000).optional(),
  }),
  describe: (i) => `Decide the intake dispute of site ${i.siteId}: ${i.outcome}`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    // On any card version: Sales may already be redrafting while the dispute is open.
    const dispute = await latestDisputeOnSite(ctx.tx, project.id);
    if (!dispute) throw new NotFound('intake_dispute', i.siteId);
    if (dispute.outcome) throw new Conflict('this dispute is already decided');
    const set = {
      outcome: i.outcome,
      outcomeNote: i.note ?? null,
      decidedBy: ctx.actor.id,
      decidedAt: ctx.now,
    };
    await recordDisputeOutcome(ctx.tx, dispute.id, set);
    ctx.emit(
      'intake.dispute.decided',
      { siteId: project.id, disputeId: dispute.id, outcome: i.outcome },
      project.clientId,
    );
    return {
      result: { id: dispute.id, outcome: i.outcome },
      audit: {
        objectType: 'intake_dispute',
        objectId: dispute.id,
        clientId: project.clientId,
        before: { outcome: null },
        after: set,
      },
    };
  },
});
