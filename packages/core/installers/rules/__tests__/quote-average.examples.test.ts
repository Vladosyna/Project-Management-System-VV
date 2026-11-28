// R29 (domain/rules.md §29, D-44) — examples: input → expected decision, with both boundaries Vlad set: exactly
// +20 % is not flagged; a pool of 2 quotes is too small to compare — ocs-sop-rule §3. Amounts in EUR.
import { describe, expect, it } from 'vitest';
import { compareWithAverage, type QuoteFigures } from '../quote-average.ts';
import { quoteAverageRule } from '../quote-average.config.ts';

/** A quote for `sensors` sensors costing `labour` + `other` EUR. */
const q = (sensors: number, labour: number, other = 0): QuoteFigures => ({
  sensors,
  labourEur: labour,
  totalEur: labour + other,
});
// Pool: 100 EUR labour and 110 EUR total per sensor.
const pool = [q(4, 400, 40), q(2, 200, 20), q(10, 1000, 100)];

const examples = [
  { name: 'pool of 2 is too small (boundary)', quote: q(4, 800), pool: pool.slice(0, 2), over: false },
  { name: 'exactly +20 % labour, total below (boundary)', quote: q(4, 480), pool, over: false },
  { name: 'labour above by more than 20 %', quote: q(4, 484), pool, over: true },
  { name: 'labour fine, total above by more than 20 %', quote: q(4, 400, 160), pool, over: true },
  { name: 'below the average', quote: q(4, 320, 20), pool, over: false },
] as const;

describe(`${quoteAverageRule.cite} quote above average`, () => {
  it.each(examples)('$name → over $over', ({ quote, pool: p, over }) => {
    expect(compareWithAverage(quote, p).over).toBe(over);
  });

  it('shows above/below the average in percent, per sensor', () => {
    expect(compareWithAverage(q(4, 500, 40), pool)).toEqual({
      over: true,
      labourPercent: 25,
      totalPercent: 23,
    });
    expect(compareWithAverage(q(4, 320, 20), pool)).toEqual({
      over: false,
      labourPercent: -20,
      totalPercent: -23,
    });
    expect(compareWithAverage(q(4, 800), pool.slice(0, 2))).toMatchObject({ labourPercent: null });
  });

  it('is P1: more than 20 % above, at least 3 quotes to compare (D-44)', () => {
    expect(quoteAverageRule).toMatchObject({ marginPercent: 20, minPool: 3, level: 'P1' });
  });
});
