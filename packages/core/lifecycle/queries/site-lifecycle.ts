// lifecycle.siteLifecycle.read — E3: a project's steps, its gates (passed / current / not started), the planned
// installation date and R9 readiness, for the Lifecycle tab and the overview stage.
import { z } from 'zod';
import { defineQuery, NotFound } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSteps, findActiveSite, templateFor } from '../repository.ts';
import { installationPlanRule } from '../rules/installation-plan.config.ts';
import { lifecycleView } from './lifecycle-view.ts';

export const siteLifecycle = defineQuery({
  name: 'lifecycle.siteLifecycle.read',
  permission: lifecyclePermissions.siteLifecycle,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const steps = await activeSteps(ctx.tx, project.id);
    const template = await templateFor(ctx.tx, project);
    const view = lifecycleView({
      steps,
      gates: template?.gates ?? [],
      plannedInstallationDate: project.plannedInstallationDate,
      countryCode: project.countryCode,
      now: ctx.now,
    });
    return {
      stage: view.stage,
      steps,
      baseSteps: installationPlanRule.baseSteps,
      template: template ? { id: template.id, name: template.name } : null,
      gates: view.gates,
      plannedInstallationDate: view.plannedInstallationDate,
      workingDaysToInstallation: view.workingDaysToInstallation,
      readinessAtRisk: view.readinessAtRisk,
    };
  },
});
