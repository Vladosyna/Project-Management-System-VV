// R27 (domain/rules.md §27) — evaluator. Reads only ./negative-margin.config.ts. Decides; never throws.
import { toCents } from './money.ts';
import { negativeMarginRule } from './negative-margin.config.ts';

export interface NegativeMarginInput {
  /** EUR amounts of the site's approved installer quotes (one per active job). */
  readonly approvedCostsEur: readonly string[];
  /** The site's confirmed commercial records that carry a price, with their EUR amount. */
  readonly clientPrices: readonly { readonly kind: string; readonly eurAmount: string | null }[];
}

const sum = (amounts: readonly string[]) => amounts.reduce((total, a) => total + toCents(a), 0n);

/** True when the approved installer cost is above the client price; no cost or no price decides nothing. */
export function negativeMargin(input: NegativeMarginInput): boolean {
  if (input.approvedCostsEur.length === 0) return false;
  for (const kind of negativeMarginRule.clientPriceFrom) {
    const prices = input.clientPrices.flatMap((p) =>
      p.kind === kind && p.eurAmount !== null ? [p.eurAmount] : [],
    );
    if (prices.length > 0) return sum(input.approvedCostsEur) > sum(prices);
  }
  return false;
}
