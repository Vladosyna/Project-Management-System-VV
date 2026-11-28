// R29 (domain/rules.md §29, D-44) — evaluator. Reads only ./quote-average.config.ts. Decides; never throws.
import { quoteAverageRule } from './quote-average.config.ts';

/** One confirmed quote reduced to what R29 compares: its sensors and its labour and total amounts in EUR. */
export interface QuoteFigures {
  readonly sensors: number;
  readonly labourEur: number;
  readonly totalEur: number;
}

const mean = (values: readonly number[]) => values.reduce((s, v) => s + v, 0) / values.length;

/**
 * The quote per sensor against the average per sensor of the pool (the other confirmed quotes of the same country and
 * scope): percent above (+) or below (−) for labour and total, and over when either is above by more than the margin.
 * With fewer quotes than the minimum pool there is nothing to compare.
 */
export function compareWithAverage(quote: QuoteFigures, pool: readonly QuoteFigures[]) {
  if (pool.length < quoteAverageRule.minPool) return { over: false, labourPercent: null, totalPercent: null };
  const limit = 100 + quoteAverageRule.marginPercent;
  const figure = (pick: (f: QuoteFigures) => number) => {
    const own = pick(quote) / quote.sensors;
    const average = mean(pool.map((p) => pick(p) / p.sensors));
    if (average === 0) return { percent: null, over: false }; // only free quotes so far: nothing to compare
    return { percent: Math.round((own / average - 1) * 100), over: own * 100 > average * limit };
  };
  const labour = figure((f) => f.labourEur);
  const total = figure((f) => f.totalEur);
  return { over: labour.over || total.over, labourPercent: labour.percent, totalPercent: total.percent };
}
