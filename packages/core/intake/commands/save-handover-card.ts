// intake.handoverCard.save — E2 AC1, SOP-DEL-01 §5 step 2: Sales fills the Handover Card (Annex B) and the §6
// checklist items it covers, as a draft, as often as needed. The package (Full / Light) is decided by the §3
// rule on every save. A returned card is redone as the next version; a submitted card is under review and
// cannot change. Group F text never goes on the card: only that it is in the restricted notes (AC7).
import { HandoverCardContent } from '@ocs/contracts';
import { z } from 'zod';
import { Conflict, defineCommand, NotFound, ValidationFailed } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import {
  hasAcceptedCard,
  insertCard,
  lastVersion,
  lockActiveSite,
  openCard,
  replaceItems,
  updateCard,
} from '../repository.ts';
import { itemCodes } from '../rules/handover-checklist.ts';
import { decidePackageTier } from '../rules/package-tier.ts';

const text = (max: number) => z.string().trim().min(1).max(max);

const Item = z.union([
  z.strictObject({
    code: z.enum(itemCodes),
    status: z.literal('provided'),
    value: text(4000).optional(),
    fileRef: text(500).optional(),
  }),
  /** "Not applicable → write N/A and the reason" (Annex B): a blank reason is refused. */
  z.strictObject({ code: z.enum(itemCodes), status: z.literal('na'), naReason: text(500) }),
]);

export const saveHandoverCard = defineCommand({
  name: 'intake.handoverCard.save',
  permission: intakePermissions.saveHandoverCard,
  input: z.object({
    siteId: z.uuid(),
    content: HandoverCardContent,
    items: z
      .array(Item)
      .max(itemCodes.length)
      .refine((is) => new Set(is.map((i) => i.code)).size === is.length, 'an item appears twice'),
    /** SOP-DEL-01 §3 inputs Sales answers; the rest comes from the card and the project's history. */
    installsOrConfigures: z.boolean(),
    newClientOrPlace: z.boolean(),
  }),
  describe: (i) => `Save the Handover Card draft of site ${i.siteId} (${String(i.items.length)} items)`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const projectType = i.content.identification?.projectType;
    const issues = [
      ...(projectType ? [] : [{ path: 'content.identification.projectType', message: 'is needed for §3' }]),
      // E2 AC7: what was promised verbally, conceded or said about people stays in the restricted notes.
      ...i.items
        .filter((it) => it.code.startsWith('F') && it.status === 'provided' && it.value !== undefined)
        .map((it) => ({ path: `items.${it.code}`, message: 'group F text goes in the restricted notes' })),
    ];
    if (issues.length > 0 || !projectType) throw new ValidationFailed(issues);

    const card = await openCard(ctx.tx, project.id);
    if (card?.status === 'submitted') throw new Conflict('the card is under intake review');
    const tier = decidePackageTier({
      projectType,
      siteFolderAccepted: await hasAcceptedCard(ctx.tx, project.id),
      installsOrConfigures: i.installsOrConfigures,
      newClientOrPlace: i.newClientOrPlace,
    });
    const id = card?.id ?? ctx.newId();
    const version = card?.version ?? (await lastVersion(ctx.tx, project.id)) + 1;
    if (card) await updateCard(ctx.tx, id, { content: i.content, package: tier.tier });
    else {
      await insertCard(ctx.tx, {
        id,
        clientId: project.clientId,
        siteId: project.id,
        version,
        package: tier.tier,
        status: 'draft',
        content: i.content,
        createdAt: ctx.now,
      });
    }
    await replaceItems(
      ctx.tx,
      { id, clientId: project.clientId },
      i.items.map((it) => ({
        id: ctx.newId(),
        clientId: project.clientId,
        cardId: id,
        code: it.code,
        status: it.status,
        value: it.status === 'provided' ? (it.value ?? null) : null,
        fileRef: it.status === 'provided' ? (it.fileRef ?? null) : null,
        naReason: it.status === 'na' ? it.naReason : null,
        createdAt: ctx.now,
      })),
      ctx.now,
    );
    const result = { id, version, package: tier.tier, packageReason: tier.reason };
    return {
      result,
      audit: {
        objectType: 'handover_card',
        objectId: id,
        clientId: project.clientId,
        before: card ? { package: card.package } : null,
        after: { ...result, items: i.items.map((it) => `${it.code}:${it.status}`) },
      },
    };
  },
});
