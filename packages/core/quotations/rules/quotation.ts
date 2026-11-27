// D-40/D-41/D-42 client quotation arithmetic. Time standard per store: partial N + 2 h, full 2N + 2 h, N = the store's
// sensors (models in quotation.config.ts; CBox not counted). Money exact in cents; hours to one decimal. Prices and
// rates are net; under DDP with local VAT each unit price and the rate are grossed up by the VAT (D-41).
import { quotationRule } from './quotation.config.ts';

export interface Devices {
  readonly model: string;
  readonly count: number;
}
export interface Store {
  readonly scope: 'partial' | 'full';
  readonly devices: readonly Devices[];
}

const counted = new Set<string>(quotationRule.hoursCountModels);
export const sensorsOf = (devices: readonly Devices[]) =>
  devices.filter((d) => counted.has(d.model)).reduce((n, d) => n + d.count, 0);

export const standardHours = (stores: readonly Store[]) =>
  stores.reduce((h, s) => h + (s.scope === 'full' ? 2 : 1) * sensorsOf(s.devices) + 2, 0);

const cents = (v: string): bigint => {
  const [whole = '0', frac = ''] = v.split('.');
  return BigInt(whole + frac.padEnd(2, '0').slice(0, 2));
};
export const money = (c: bigint) => {
  const s = c.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
};

/** Net price grossed up by VAT (DDP local VAT), per unit, rounded half up to the cent. */
export function grossUp(net: string, vatRate: string | null): string {
  if (vatRate === null) return money(cents(net));
  const [w = '0', f = ''] = vatRate.split('.');
  const basisPoints = BigInt(w + f.padEnd(2, '0').slice(0, 2));
  return money((cents(net) * (10000n + basisPoints) + 5000n) / 10000n);
}

export interface Line {
  readonly kind: 'device' | 'installation' | 'other';
  readonly label: string;
  readonly unitPrice: string;
  readonly units: number;
}

/** unit price × units per line (units to one decimal), exact; and the sum. */
export function priced(lines: readonly Line[]) {
  const out = lines.map((l) => {
    const sub = (cents(l.unitPrice) * BigInt(Math.round(l.units * 10)) + 5n) / 10n;
    return { ...l, unitPrice: money(cents(l.unitPrice)), subtotal: money(sub), sub };
  });
  const total = out.reduce((a, l) => a + l.sub, 0n);
  return {
    lines: out.map((l) => ({
      kind: l.kind,
      label: l.label,
      unitPrice: l.unitPrice,
      units: l.units,
      subtotal: l.subtotal,
    })),
    subtotal: money(total),
  };
}
