// intake.conditionalStart.authorise — E2 AC4, SOP-DEL-01 §9: only the sponsor authorises Delivery to
// start before acceptance, in writing in DingTalk (the reference is recorded), naming the missing items and a
// deadline within 5 working days. The items stay Sales' responsibility. One per card version.
// Assumption: working days follow the project's country calendar (GB where none exists yet), as in E3.
import { z } from 'zod';
import { addWorkingDays, calendarIds, localDateIn, type CalendarId } from '../../calendar/index.ts';
import { Conflict, defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import {
  activeConditionalStart,
  insertConditionalStart,
  lockActiveSite,
  openCard,
  openDisputeOnSite,
} from '../repository.ts';
import { conditionalStartRule } from '../rules/conditional-start.config.ts';
import { checkConditionalStart } from '../rules/conditional-start.ts';
import { itemCodes } from '../rules/handover-checklist.ts';

const calendarOf = (country: string): CalendarId =>
  (calendarIds as readonly string[]).includes(country) ? (country as CalendarId) : 'GB';

export const authoriseConditionalStart = defineCommand({
  name: 'intake.conditionalStart.authorise',
  permission: intakePermissions.authoriseConditionalStart,
  input: z.object({
    siteId: z.uuid(),
    missingItems: z
      .array(z.enum(itemCodes))
      .min(1)
      .max(itemCodes.length)
      .refine((xs) => new Set(xs).size === xs.length, 'an item appears twice'),
    deadline: z.iso.date(),
    /** The written authorisation in DingTalk: message link or reference. */
    writtenRef: z.string().trim().min(1).max(500),
  }),
  describe: (i) => `Authorise a Conditional Start for site ${i.siteId} until ${i.deadline}`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const card = await openCard(ctx.tx, project.id);
    if (!card) throw new NotFound('handover_card before acceptance', i.siteId);
    // SOP-DEL-01 §9: "Work does not start while the dispute is open."
    if (await openDisputeOnSite(ctx.tx, project.id)) {
      throw new RuleViolation('SOP-DEL-01 §9', 'work does not start while an intake dispute is open');
    }
    if (await activeConditionalStart(ctx.tx, card.id))
      throw new Conflict('this card already has a Conditional Start');
    const today = localDateIn(ctx.now, 'UTC');
    const latestDeadline = addWorkingDays(
      today,
      conditionalStartRule.maxWorkingDays,
      calendarOf(project.countryCode),
    );
    checkConditionalStart({ deadline: i.deadline, today, latestDeadline });
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      cardId: card.id,
      authorisedBy: ctx.actor.id,
      missingItems: [...i.missingItems].sort(),
      deadline: i.deadline,
      writtenRef: i.writtenRef,
      createdAt: ctx.now,
    };
    await insertConditionalStart(ctx.tx, row);
    ctx.emit(
      'intake.conditionalStart.authorised',
      { siteId: project.id, cardId: card.id, missingItems: row.missingItems, deadline: row.deadline },
      project.clientId,
    );
    return {
      result: { id: row.id, version: card.version, latestDeadline },
      audit: {
        objectType: 'conditional_start',
        objectId: row.id,
        clientId: project.clientId,
        before: null,
        after: row,
      },
    };
  },
});
