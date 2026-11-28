// R27 (domain/rules.md §27) — examples: input → expected decision, with the boundary (cost equal to the client price
// is not negative) — ocs-sop-rule §3. Amounts in EUR, as stored.
import { describe, expect, it } from 'vitest';
import { negativeMargin } from '../negative-margin.ts';
import { negativeMarginRule } from '../negative-margin.config.ts';

const pl = (eurAmount: string | null) => ({ kind: 'price_list', eurAmount });
const po = (eurAmount: string | null) => ({ kind: 'client_po', eurAmount });

const examples = [
  { name: 'no approved cost', costs: [], prices: [pl('100.00')], negative: false },
  { name: 'no client price', costs: ['500.00'], prices: [], negative: false },
  { name: 'cost above the price list', costs: ['100.01'], prices: [pl('100.00')], negative: true },
  { name: 'cost equal to the price (boundary)', costs: ['100.00'], prices: [pl('100.00')], negative: false },
  { name: 'several approved jobs add up', costs: ['60.00', '50.00'], prices: [pl('100.00')], negative: true },
  {
    name: 'price list wins over the PO',
    costs: ['150.00'],
    prices: [po('100.00'), pl('200.00')],
    negative: false,
  },
  {
    name: 'without a price list, POs add up',
    costs: ['150.00'],
    prices: [po('100.00'), po('60.00')],
    negative: false,
  },
  { name: 'without a price list, PO below cost', costs: ['150.00'], prices: [po('100.00')], negative: true },
  { name: 'a PO without an amount is no price', costs: ['150.00'], prices: [po(null)], negative: false },
] as const;

describe(`${negativeMarginRule.cite} negative margin`, () => {
  it.each(examples)('$name → negative $negative', ({ costs, prices, negative }) => {
    expect(negativeMargin({ approvedCostsEur: costs, clientPrices: prices })).toBe(negative);
  });

  it('is P0; the price list first, then the client PO', () => {
    expect(negativeMarginRule).toMatchObject({ clientPriceFrom: ['price_list', 'client_po'], level: 'P0' });
  });
});
