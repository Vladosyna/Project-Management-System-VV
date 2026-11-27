// lifecycle.readinessGaps.read — the hourly R9 run (domain/rules.md R9, P0; SOP-DEL-04 steps 6–7: readiness confirmed
// in writing before installation, no one travels to a site that has not confirmed it). Every active project, with r9
// set when the planned installation is within the readiness window — the gate template's days, else the rule
// default — and readiness is not confirmed; never once the project reached readinessRule.alertEndsAt (installed).
// The system actor only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSites, activeSteps, templateFor } from '../repository.ts';
import { readinessAtRisk } from '../rules/readiness.ts';
import { readinessRule } from '../rules/readiness.config.ts';
import { workingDaysToInstallation } from './installation-countdown.ts';

export const readinessGaps = defineQuery({
  name: 'lifecycle.readinessGaps.read',
  permission: lifecyclePermissions.readinessGaps,
  input: z.object({}),
  handle: async (ctx) => {
    const rows = [];
    for (const s of await activeSites(ctx.tx)) {
      const daysTo = workingDaysToInstallation(s.plannedInstallationDate, ctx.now, s.countryCode);
      let r9 = false;
      if (daysTo !== null) {
        const reached = (await activeSteps(ctx.tx, s.id)).map((st) => st.step);
        const gates = (await templateFor(ctx.tx, s))?.gates ?? [];
        const templateDays = [...gates]
          .sort((a, b) => a.order - b.order)
          .find((g) => g.readinessDays !== undefined)?.readinessDays;
        r9 =
          !reached.includes(readinessRule.alertEndsAt) &&
          readinessAtRisk({ workingDaysToInstallation: daysTo, reached, templateDays });
      }
      rows.push({
        siteId: s.id,
        projectId: s.projectId,
        r9,
        plannedInstallationDate: s.plannedInstallationDate,
        workingDaysToInstallation: daysTo,
      });
    }
    return rows;
  },
});
