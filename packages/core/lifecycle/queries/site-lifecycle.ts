// lifecycle.siteLifecycle.read — E3: a project's steps, its gates (passed / current / not started), the planned
// installation date and R9 readiness, for the Lifecycle tab and the overview stage.
import { z } from 'zod';
import { defineQuery, NotFound } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSteps, findActiveSite, templateFor } from '../repository.ts';
import { installationPlanRule } from '../rules/installation-plan.config.ts';
import { readinessAtRisk } from '../rules/readiness.ts';
import { workingDaysToInstallation } from './installation-countdown.ts';

export const siteLifecycle = defineQuery({
  name: 'lifecycle.siteLifecycle.read',
  permission: lifecyclePermissions.siteLifecycle,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const steps = await activeSteps(ctx.tx, project.id);
    const reached = steps.map((s) => s.step);
    const template = await templateFor(ctx.tx, project);
    const gates = [...(template?.gates ?? [])].sort((a, b) => a.order - b.order);
    const firstOpen = gates.find((g) => !reached.includes(g.key))?.key;
    const planned = project.plannedInstallationDate;
    const daysTo = workingDaysToInstallation(planned, ctx.now, project.countryCode);
    const templateDays = gates.find((g) => g.readinessDays !== undefined)?.readinessDays;
    const stage = [...installationPlanRule.baseSteps].reverse().find((s) => reached.includes(s)) ?? null;
    return {
      stage,
      steps,
      baseSteps: installationPlanRule.baseSteps,
      template: template ? { id: template.id, name: template.name } : null,
      gates: gates.map((g) => ({
        key: g.key,
        name: g.name,
        status: reached.includes(g.key)
          ? ('passed' as const)
          : g.key === firstOpen
            ? ('current' as const)
            : ('not_started' as const),
        doneOn: steps.find((s) => s.step === g.key)?.doneOn ?? null,
      })),
      plannedInstallationDate: planned,
      workingDaysToInstallation: daysTo,
      readinessAtRisk: readinessAtRisk({ workingDaysToInstallation: daysTo, reached, templateDays }),
    };
  },
});
