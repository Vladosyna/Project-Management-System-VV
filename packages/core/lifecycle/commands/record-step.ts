// lifecycle.step.record — E3 AC1: a step reached on a project — a base step of SOP-DEL-04 in order, or a gate of
// the project's template — with date, actor and evidence. "accepted" needs its acceptance evidence (AC4).
import { z } from 'zod';
import { Conflict, defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSteps, findTemplate, insertStep, lockActiveSite } from '../repository.ts';
import { checkStep, isBaseStep } from '../rules/installation-plan.ts';

export const recordStep = defineCommand({
  name: 'lifecycle.step.record',
  permission: lifecyclePermissions.recordStep,
  input: z.object({
    siteId: z.uuid(),
    step: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    doneOn: z.iso.date(),
    evidence: z.string().trim().min(1).max(500).optional(),
    note: z.string().trim().min(1).max(1000).optional(),
  }),
  describe: (i) => `Record step ${i.step} on ${i.doneOn} for site ${i.siteId}`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    if (!isBaseStep(i.step)) {
      const template = project.gateTemplateId
        ? await findTemplate(ctx.tx, project.gateTemplateId)
        : undefined;
      if (!template?.gates.some((g) => g.key === i.step)) {
        throw new RuleViolation('E3 AC3', `"${i.step}" is not a step or a gate of this project`);
      }
    }
    const reached = (await activeSteps(ctx.tx, project.id)).map((s) => s.step);
    if (reached.includes(i.step)) throw new Conflict(`"${i.step}" is already recorded`);
    checkStep({ step: i.step, reached, standard: project.standard, evidence: i.evidence ?? null });
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      step: i.step,
      doneOn: i.doneOn,
      actorId: ctx.actor.id,
      evidence: i.evidence ?? null,
      note: i.note ?? null,
      createdAt: ctx.now,
    };
    await insertStep(ctx.tx, row);
    ctx.emit(
      'lifecycle.step.recorded',
      { siteId: project.id, step: row.step, doneOn: row.doneOn },
      project.clientId,
    );
    return {
      result: { id: row.id },
      audit: {
        objectType: 'site_step',
        objectId: row.id,
        clientId: project.clientId,
        before: null,
        after: row,
      },
    };
  },
});
