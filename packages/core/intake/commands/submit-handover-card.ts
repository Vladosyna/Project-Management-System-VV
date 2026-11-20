// intake.handoverCard.submit — E2 AC1, SOP-DEL-01 §5 step 3: Sales submits the draft for the intake review.
// Refused while the package lacks a §6 item it needs ("blanks are not accepted"); the submission time starts
// the Delivery Director's 2-working-day review clock.
import { z } from 'zod';
import { defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import { activeItems, lockActiveSite, openCard, updateCard } from '../repository.ts';
import { handoverChecklistRule } from '../rules/handover-checklist.config.ts';
import { handoverGaps } from '../rules/handover-checklist.ts';

export const submitHandoverCard = defineCommand({
  name: 'intake.handoverCard.submit',
  permission: intakePermissions.submitHandoverCard,
  input: z.object({ siteId: z.uuid() }),
  describe: (i) => `Submit the Handover Card of site ${i.siteId} for intake review`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const card = await openCard(ctx.tx, project.id);
    if (card?.status !== 'draft') throw new NotFound('handover_card draft', i.siteId);
    const gaps = handoverGaps(
      card.package,
      (await activeItems(ctx.tx, card.id)).map((it) => ({ code: it.code, status: it.status })),
    );
    if (gaps.length > 0) {
      throw new RuleViolation(
        handoverChecklistRule.cite,
        `the ${card.package} package still lacks ${gaps.map((g) => (g.why === 'missing' ? g.code : `${g.code} (N/A not allowed)`)).join(', ')}`,
      );
    }
    await updateCard(ctx.tx, card.id, {
      status: 'submitted',
      submittedAt: ctx.now,
      submittedBy: ctx.actor.id,
    });
    ctx.emit(
      'intake.handoverCard.submitted',
      { cardId: card.id, siteId: project.id, version: card.version },
      project.clientId,
    );
    return {
      result: { id: card.id, version: card.version, submittedAt: ctx.now.toISOString() },
      audit: {
        objectType: 'handover_card',
        objectId: card.id,
        clientId: project.clientId,
        before: { status: 'draft' },
        after: { status: 'submitted' },
      },
    };
  },
});
