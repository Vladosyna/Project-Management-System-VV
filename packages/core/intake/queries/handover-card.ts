// intake.handoverCard.read — E2: a project's current Handover Card for its Intake tab — status, version, package,
// Annex B content, the §6 items with what still blocks submission, Delivery's decision with its conditions, and a
// Conditional Start if one was authorised. Internal staff only (RLS: no client or partner policy). Group F text
// is never on the card (AC7), so nothing restricted is returned here. Null when no card was started.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import { activeItems, conditionalStartOf, decisionOf, latestCard } from '../repository.ts';
import { handoverGaps } from '../rules/handover-checklist.ts';

export const handoverCardView = defineQuery({
  name: 'intake.handoverCard.read',
  permission: intakePermissions.handoverCard,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const card = await latestCard(ctx.tx, i.siteId);
    if (!card) return null;
    const items = (await activeItems(ctx.tx, card.id))
      .map((it) => ({
        code: it.code,
        status: it.status,
        value: it.value,
        fileRef: it.fileRef,
        naReason: it.naReason,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
    const decision = await decisionOf(ctx.tx, card.id);
    const start = await conditionalStartOf(ctx.tx, card.id);
    return {
      id: card.id,
      version: card.version,
      status: card.status,
      package: card.package,
      content: card.content as Record<string, unknown>,
      submittedAt: card.submittedAt?.toISOString() ?? null,
      items,
      gaps: handoverGaps(card.package, items),
      decision: decision && {
        decision: decision.decision,
        folderStandard: decision.folderStandard,
        reasons: decision.reasons,
        decidedAt: decision.decidedAt.toISOString(),
        conditions: decision.conditions,
      },
      conditionalStart: start ?? null,
    };
  },
});
