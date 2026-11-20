// intake.review.decide — E2 AC2/AC3, SOP-DEL-01 §5 step 4 and §8: the Delivery Director decides on the submitted
// Handover Card — Accepted, Accepted with conditions (non-blocking items only, each with a deadline within 5
// working days) or Returned (every gap listed; Sales resubmits as the next version). Section 11 of the card.
// Assumption: working days follow the project's country calendar (GB where none exists yet), as in E3.
import { IntakeReview } from '@ocs/contracts';
import { addWorkingDays, calendarIds, localDateIn, type CalendarId } from '../../calendar/index.ts';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import { insertDecision, lockActiveSite, openCard, updateCard } from '../repository.ts';
import { intakeReviewRule } from '../rules/intake-review.config.ts';
import { checkIntakeReview } from '../rules/intake-review.ts';
import { z } from 'zod';

const calendarOf = (country: string): CalendarId =>
  (calendarIds as readonly string[]).includes(country) ? (country as CalendarId) : 'GB';

export const decideIntake = defineCommand({
  name: 'intake.review.decide',
  permission: intakePermissions.decideIntake,
  input: IntakeReview.extend({ siteId: z.uuid() }),
  describe: (i) => `Intake review of site ${i.siteId}: ${i.decision}`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const card = await openCard(ctx.tx, project.id);
    if (card?.status !== 'submitted') throw new NotFound('submitted handover_card', i.siteId);
    const today = localDateIn(ctx.now, 'UTC');
    const latestDeadline = addWorkingDays(
      today,
      intakeReviewRule.maxConditionWorkingDays,
      calendarOf(project.countryCode),
    );
    checkIntakeReview({
      decision: i.decision,
      conditions: i.conditions,
      reasons: i.reasons ?? null,
      assignedPmId: i.assignedPmId ?? null,
      today,
      latestDeadline,
    });
    const id = ctx.newId();
    const row = {
      id,
      clientId: project.clientId,
      cardId: card.id,
      decision: i.decision,
      folderStandard: i.folderStandard,
      reasons: i.reasons ?? null,
      assignedPmId: i.assignedPmId ?? null,
      handoverMeeting: i.handoverMeeting ?? null,
      transferDate: i.transferDate ?? null,
      decidedBy: ctx.actor.id,
      decidedAt: ctx.now,
    };
    await insertDecision(
      ctx.tx,
      row,
      i.conditions.map((c) => ({
        id: ctx.newId(),
        clientId: project.clientId,
        decisionId: id,
        ...c,
        createdAt: ctx.now,
      })),
    );
    await updateCard(ctx.tx, card.id, { status: i.decision });
    ctx.emit(
      'intake.review.decided',
      { siteId: project.id, cardId: card.id, version: card.version, decision: i.decision },
      project.clientId,
    );
    return {
      result: { id, decision: i.decision, version: card.version, latestDeadline },
      audit: {
        objectType: 'handover_card',
        objectId: card.id,
        clientId: project.clientId,
        before: { status: 'submitted' },
        after: { ...row, conditions: i.conditions },
      },
    };
  },
});
