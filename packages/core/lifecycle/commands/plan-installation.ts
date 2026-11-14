// lifecycle.installation.plan — SOP-DEL-04 §1: the planned installation date, only once the site card is complete.
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSteps, lockActiveSite, setPlannedInstallation } from '../repository.ts';
import { checkInstallationPlan } from '../rules/installation-plan.ts';

export const planInstallation = defineCommand({
  name: 'lifecycle.installation.plan',
  permission: lifecyclePermissions.planInstallation,
  input: z.object({ siteId: z.uuid(), date: z.iso.date() }),
  describe: (i) => `Plan installation of site ${i.siteId} on ${i.date}`,
  handle: async (ctx, i) => {
    const project = await lockActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    checkInstallationPlan({ reached: (await activeSteps(ctx.tx, project.id)).map((s) => s.step) });
    await setPlannedInstallation(ctx.tx, project.id, i.date);
    ctx.emit('lifecycle.installation.planned', { siteId: project.id, date: i.date }, project.clientId);
    return {
      result: { date: i.date },
      audit: {
        objectType: 'site',
        objectId: project.id,
        clientId: project.clientId,
        before: { plannedInstallationDate: project.plannedInstallationDate },
        after: { plannedInstallationDate: i.date },
      },
    };
  },
});
