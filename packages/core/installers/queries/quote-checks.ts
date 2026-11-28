// installers.quoteChecks.read — R29 (domain/rules.md §29, P1; P-12, D-34 N1): for the hourly alert run, every active
// site with an installer job, flagged when a confirmed quote of a job still being quoted has more hours than the time
// standard (partial N + 2 h, full 2N + 2 h). The worst quote's hours are returned. The system actor only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { quotesToCheck } from '../repository.ts';
import { hoursOverStandard } from '../rules/time-standard.ts';
import { timeStandardRule } from '../rules/time-standard.config.ts';

const line = z.object({ kind: z.string(), quantity: z.number() });
const checked = new Set<string>(timeStandardRule.checkWhile);

export const quoteChecks = defineQuery({
  name: 'installers.quoteChecks.read',
  permission: installersPermissions.quoteChecks,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, quotes } = await quotesToCheck(ctx.tx);
    return sites.map((s) => {
      const results = quotes
        .filter((q) => q.siteId === s.id && checked.has(q.status))
        .map((q) =>
          hoursOverStandard({
            scope: q.scope,
            sensorCount: q.sensorCount,
            lines: z.array(line).parse(q.lines),
          }),
        )
        .filter((r) => r.over)
        .sort((a, b) => b.quoted - b.standard - (a.quoted - a.standard));
      const worst = results[0];
      return {
        siteId: s.id,
        projectId: s.projectId,
        r29: worst !== undefined,
        quotedHours: worst?.quoted ?? null,
        standardHours: worst?.standard ?? null,
      };
    });
  },
});
