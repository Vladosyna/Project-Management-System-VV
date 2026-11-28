// installers.site.read — E12 AC3/AC4: a site's installer jobs, each with its quotes cheapest first (in EUR), lines,
// original currency and EUR, confirmed or proposed, and — once confirmed — per sensor against the average of
// comparable quotes (R29, D-44). Internal only (installer names are staff data).
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { jobsOfSite } from '../repository.ts';
import { compareQuotes } from './quote-comparison.ts';

export const siteJobs = defineQuery({
  name: 'installers.site.read',
  permission: installersPermissions.siteJobs,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const { jobs, quotes } = await jobsOfSite(ctx.tx, i.siteId);
    const vs = new Map((await compareQuotes(ctx.tx)).compared.map((c) => [c.id, c]));
    /** Null until confirmed; the percentages are null while fewer than 3 quotes compare. */
    const vsAverage = (id: string) => {
      const c = vs.get(id);
      return c ? { labourPercent: c.labourPercent, totalPercent: c.totalPercent } : null;
    };
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
          vsAverage: vsAverage(q.id),
        })),
    }));
  },
});
