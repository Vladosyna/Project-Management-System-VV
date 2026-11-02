// work.visit.record — E5 AC3: the same-day internal record of a site visit, in the order of the DingTalk
// Action Record template (SOP-DEL-03 §5.1), with its Key Action Items as actions (owner + date, §4).
import { z } from 'zod';
import { defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { findActiveSite, insertActions, insertVisit } from '../repository.ts';

const text = (max: number) => z.string().trim().min(1).max(max);
const owner = z.union([z.strictObject({ userId: z.uuid() }), z.strictObject({ name: text(200) })]);

export const visitTypes = [
  'site_survey',
  'technical_inspection',
  'installation',
  'commissioning',
  'maintenance',
] as const;

export const recordVisit = defineCommand({
  name: 'work.visit.record',
  permission: workPermissions.recordVisit,
  input: z
    .object({
      siteId: z.uuid(),
      type: z.enum(visitTypes),
      visitDate: z.iso.date(),
      attendees: z
        .array(z.strictObject({ name: text(200), side: z.enum(['vv', 'client', 'third_party']) }))
        .min(1)
        .max(50),
      summary: text(2000),
      /** §4: what was agreed, and with whom by name — not "the client". */
      decided: z
        .array(z.strictObject({ text: text(1000), agreedWith: text(200) }))
        .max(50)
        .default([]),
      discussed: z.array(text(1000)).max(50).default([]),
      keyPoints: text(4000).optional(),
      coverage: z.strictObject({
        done: z.int().min(0),
        total: z.int().min(1),
        gap: text(1000).optional(),
      }),
      actions: z
        .array(z.strictObject({ title: text(300), owner, due: z.iso.date() }))
        .max(50)
        .default([]),
      followUp: text(1000).optional(),
      escalate: z.boolean().default(false),
      minutesRef: text(500).optional(),
    })
    .refine((i) => i.coverage.done <= i.coverage.total, {
      path: ['coverage', 'done'],
      message: 'more than total',
    })
    .refine((i) => i.coverage.done === i.coverage.total || i.coverage.gap !== undefined, {
      path: ['coverage', 'gap'],
      message: 'say why the rest was not covered (SOP-DEL-03 §4)',
    }),
  describe: (i) => `Record ${i.type} visit on ${i.visitDate} at site ${i.siteId}`,
  handle: async (ctx, i) => {
    // Dates are local to the site; UTC "today" lags Asia by up to a day, so allow one day ahead of UTC.
    const latest = new Date(ctx.now.getTime() + 86_400_000).toISOString().slice(0, 10);
    if (i.visitDate > latest) {
      throw new RuleViolation('SOP-DEL-03 §5.1', 'A visit is recorded after it happened, not before');
    }
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      type: i.type,
      visitDate: i.visitDate,
      attendees: i.attendees,
      summary: i.summary,
      decided: i.decided,
      discussed: i.discussed,
      keyPoints: i.keyPoints ?? null,
      coverageDone: i.coverage.done,
      coverageTotal: i.coverage.total,
      coverageGap: i.coverage.gap ?? null,
      followUp: i.followUp ?? null,
      escalate: i.escalate,
      minutesRef: i.minutesRef ?? null,
      recordedBy: ctx.actor.id,
      recordedAt: ctx.now,
    };
    await insertVisit(ctx.tx, row);
    const actions = i.actions.map((a) => ({
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      title: a.title,
      ownerId: 'userId' in a.owner ? a.owner.userId : null,
      ownerName: 'name' in a.owner ? a.owner.name : null,
      due: a.due,
      sourceKind: 'visit' as const,
      sourceRef: row.id,
      visitId: row.id,
      createdBy: ctx.actor.id,
      createdAt: ctx.now,
    }));
    await insertActions(ctx.tx, actions);
    ctx.emit(
      'work.visit.recorded',
      { visitId: row.id, siteId: row.siteId, actions: actions.length },
      row.clientId,
    );
    // §7: escalations are flagged directly, the same day — the Delivery Director's notice reads this event.
    if (i.escalate) ctx.emit('work.visit.escalated', { visitId: row.id, siteId: row.siteId }, row.clientId);
    return {
      result: { id: row.id, actionIds: actions.map((a) => a.id) },
      audit: {
        objectType: 'visit',
        objectId: row.id,
        clientId: row.clientId,
        before: null,
        after: { ...row, actionIds: actions.map((a) => a.id) },
      },
    };
  },
});
