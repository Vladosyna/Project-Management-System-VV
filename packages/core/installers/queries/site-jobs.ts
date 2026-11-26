// installers.site.read — E12 AC3/AC4: a site's installer jobs, each with its quotes cheapest first (in EUR), lines,
// original currency and EUR, confirmed or proposed. Internal only (installer names are staff data).
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { jobsOfSite } from '../repository.ts';

export const siteJobs = defineQuery({
  name: 'installers.site.read',
  permission: installersPermissions.siteJobs,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const { jobs, quotes } = await jobsOfSite(ctx.tx, i.siteId);
    return jobs.map(({ job, installer }) => ({
      id: job.id,
      installer,
      scope: job.scope,
      sensorCount: job.sensorCount,
      sowVersion: job.sowVersion,
      scheduledOn: job.scheduledOn,
      status: job.status,
      quotes: quotes
        .filter((q) => q.quote.jobId === job.id)
        .map(({ quote: q, installer: name }) => ({
          id: q.id,
          installer: name,
          lines: q.lines,
          amount: q.amount,
          currency: q.currency,
          eur: q.eurAmount,
          fxRate: q.fxRate,
          validUntil: q.validUntil,
          source: { kind: q.sourceKind, ref: q.sourceRef },
          confirmed: q.confirmedAt !== null,
        })),
    }));
  },
});
