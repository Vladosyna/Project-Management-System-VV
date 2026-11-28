// lifecycle.readinessGaps.read — the hourly R9 run (domain/rules.md R9, P0; SOP-DEL-04 steps 6–7: readiness confirmed
// in writing before installation, no one travels to a site that has not confirmed it). Every active project, with r9
// set when the planned installation is within the readiness window — the gate template's days, else the rule
// default — and readiness is not confirmed; never once the project reached readinessRule.alertEndsAt (installed).
// Read in three queries whatever the number of projects (review of #121), the same way as the programme tracker.
// The system actor only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSites, activeStepsOf, activeTemplates, pickTemplate } from '../repository.ts';
import { readinessRule } from '../rules/readiness.config.ts';
import { lifecycleView } from './lifecycle-view.ts';

export const readinessGaps = defineQuery({
  name: 'lifecycle.readinessGaps.read',
  permission: lifecyclePermissions.readinessGaps,
  input: z.object({}),
  handle: async (ctx) => {
    const sites = await activeSites(ctx.tx);
    const steps = await activeStepsOf(
      ctx.tx,
      sites.map((s) => s.id),
    );
    const templates = await activeTemplates(ctx.tx);
    return sites.map((s) => {
      const mine = steps.filter((st) => st.siteId === s.id);
      const view = lifecycleView({
        steps: mine,
        gates: pickTemplate(templates, s)?.gates ?? [],
        plannedInstallationDate: s.plannedInstallationDate,
        countryCode: s.countryCode,
        now: ctx.now,
      });
      return {
        siteId: s.id,
        projectId: s.projectId,
        r9: view.readinessAtRisk && !mine.some((st) => st.step === readinessRule.alertEndsAt),
        plannedInstallationDate: s.plannedInstallationDate,
        workingDaysToInstallation: view.workingDaysToInstallation,
      };
    });
  },
});
