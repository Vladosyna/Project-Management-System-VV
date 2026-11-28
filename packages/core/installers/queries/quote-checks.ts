// installers.quoteChecks.read — R29 (domain/rules.md §29, P1; D-44): for the hourly alert run, every active site with
// an installer job, flagged when a confirmed quote of a job still being quoted is, per sensor, more than the margin
// above the average of the other confirmed quotes of the same country and scope (labour ÷ sensors, total ÷ sensors).
// The most-above quote's percentages are returned. Amounts compared in EUR. The system actor only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { quoteAverageRule } from '../rules/quote-average.config.ts';
import { compareQuotes } from './quote-comparison.ts';

const checked = new Set<string>(quoteAverageRule.checkWhile);

export const quoteChecks = defineQuery({
  name: 'installers.quoteChecks.read',
  permission: installersPermissions.quoteChecks,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, compared } = await compareQuotes(ctx.tx);
    return sites.map((s) => {
      const worst = compared
        .filter((q) => q.siteId === s.id && checked.has(q.status) && q.over)
        .sort(
          (a, b) =>
            Math.max(b.labourPercent ?? 0, b.totalPercent ?? 0) -
            Math.max(a.labourPercent ?? 0, a.totalPercent ?? 0),
        )[0];
      return {
        siteId: s.id,
        projectId: s.projectId,
        r29: worst !== undefined,
        labourPercent: worst?.labourPercent ?? null,
        totalPercent: worst?.totalPercent ?? null,
      };
    });
  },
});
