// Money in the original currency and in EUR (D-34 N2, Vlad 23 Nov: "original + euro"). Exact decimal arithmetic:
// amounts have 2 decimals, rates (EUR per 1 unit of the currency) 6; the EUR value is rounded half up to cents.
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;
const RATE = /^\d{1,8}(\.\d{1,6})?$/;

const scaled = (value: string, places: number): bigint => {
  const [whole = '0', frac = ''] = value.split('.');
  return BigInt(whole + frac.padEnd(places, '0'));
};

export const isAmount = (v: string) => AMOUNT.test(v);
export const isRate = (v: string) => RATE.test(v) && scaled(v, 6) > 0n;

/** amount × rate in EUR, as a string with 2 decimals. */
export function toEur(amount: string, rate: string): string {
  const micro = scaled(amount, 2) * scaled(rate, 6); // cents × 10^6
  const cents = (micro + 500_000n) / 1_000_000n;
  const s = cents.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}
