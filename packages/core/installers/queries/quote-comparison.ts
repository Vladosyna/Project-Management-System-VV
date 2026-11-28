// R29 (D-44): each confirmed, active quote against the average of the other confirmed quotes of the same country and
// scope, per sensor (labour ÷ sensors, total ÷ sensors), in EUR. Shared by the alert run (quoteChecks) and the
// Installers tab (siteJobs), so both show the same figures.
import { z } from 'zod';
import { quotesToCheck } from '../repository.ts';
import { compareWithAverage, type QuoteFigures } from '../rules/quote-average.ts';
import { quoteAverageRule } from '../rules/quote-average.config.ts';

const lines = z.array(z.object({ kind: z.string(), quantity: z.number(), unitPrice: z.string() }));
const labourKinds = new Set<string>(quoteAverageRule.labourLines);

/** `near`: only the pools of one site (its country and job scopes), for its Installers tab. */
export async function compareQuotes(
  tx: Parameters<typeof quotesToCheck>[0],
  near?: Parameters<typeof quotesToCheck>[1],
) {
  const { sites, quotes } = await quotesToCheck(tx, near);
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
  const compared = all.map((q) => {
    const pool = all.filter((p) => p.id !== q.id && p.countryCode === q.countryCode && p.scope === q.scope);
    return {
      id: q.id,
      siteId: q.siteId,
      status: q.status,
      ...compareWithAverage(
        q.figures,
        pool.map((p) => p.figures),
      ),
    };
  });
  return { sites, compared };
}
