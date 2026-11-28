// installers.quoteChecks.read — R29 (domain/rules.md §29, P1; D-44): for the hourly alert run, every active site with
// an installer job, flagged when a confirmed quote of a job still being quoted is, per sensor, more than the margin
// above the average of the other confirmed quotes of the same country and scope (labour ÷ sensors, total ÷ sensors).
// The most-above quote's percentages are returned. Amounts compared in EUR. The system actor only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { quotesToCheck } from '../repository.ts';
import { compareWithAverage, type QuoteFigures } from '../rules/quote-average.ts';
import { quoteAverageRule } from '../rules/quote-average.config.ts';

const lines = z.array(z.object({ kind: z.string(), quantity: z.number(), unitPrice: z.string() }));
const labourKinds = new Set<string>(quoteAverageRule.labourLines);
const checked = new Set<string>(quoteAverageRule.checkWhile);

export const quoteChecks = defineQuery({
  name: 'installers.quoteChecks.read',
  permission: installersPermissions.quoteChecks,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, quotes } = await quotesToCheck(ctx.tx);
    const all = quotes.map((q) => {
      // Labour lines are in the quote's currency; the rate turns them into EUR like the stored total.
      const labour = lines
        .parse(q.lines)
        .filter((l) => labourKinds.has(l.kind))
        .reduce((sum, l) => sum + l.quantity * Number(l.unitPrice), 0);
      const figures: QuoteFigures = {
        sensors: q.sensorCount,
        labourEur: labour * Number(q.fxRate),
        totalEur: Number(q.eurAmount),
      };
      return { ...q, figures };
    });
    return sites.map((s) => {
      const results = all
        .filter((q) => q.siteId === s.id && checked.has(q.status))
        .map((q) => {
          const pool = all.filter(
            (p) => p.id !== q.id && p.countryCode === q.countryCode && p.scope === q.scope,
          );
          return compareWithAverage(
            q.figures,
            pool.map((p) => p.figures),
          );
        })
        .filter((r) => r.over)
        .sort(
          (a, b) =>
            Math.max(b.labourPercent ?? 0, b.totalPercent ?? 0) -
            Math.max(a.labourPercent ?? 0, a.totalPercent ?? 0),
        );
      const worst = results[0];
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
