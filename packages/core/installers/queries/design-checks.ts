// installers.designChecks.read — R12 (domain/rules.md §12, P0): for the hourly alert run, every active site with an
// installer job, flagged when an open job's sensor count differs from the store's current design (active proposal,
// D-43; CBox not counted, D-42). The first differing job's counts are returned. The system actor only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { designSensors } from '../../quotations/index.ts';
import { installersPermissions } from '../permissions.ts';
import { jobsToCompare } from '../repository.ts';
import { sensorsDiffer } from '../rules/sensors-vs-design.ts';

export const designChecks = defineQuery({
  name: 'installers.designChecks.read',
  permission: installersPermissions.designChecks,
  input: z.object({}),
  handle: async (ctx) => {
    const jobs = await jobsToCompare(ctx.tx);
    const siteIds = [...new Set(jobs.map((j) => j.siteId))];
    const design = await designSensors(ctx.tx, siteIds);
    return siteIds.map((siteId) => {
      const mine = jobs.filter((j) => j.siteId === siteId);
      const designed = design.get(siteId) ?? null;
      const off = mine.find((j) =>
        sensorsDiffer({ status: j.status, jobSensors: j.sensorCount, designSensors: designed }),
      );
      return {
        siteId,
        projectId: mine[0]?.projectId ?? '',
        r12: off !== undefined,
        jobSensors: off?.sensorCount ?? null,
        designSensors: off ? designed : null,
      };
    });
  },
});
