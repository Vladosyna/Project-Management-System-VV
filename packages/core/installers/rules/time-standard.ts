// R29 (domain/rules.md §29) — evaluator. Reads only ./time-standard.config.ts. Decides; never throws.
import { timeStandardRule } from './time-standard.config.ts';

export interface TimeStandardInput {
  readonly scope: 'partial' | 'full';
  readonly sensorCount: number;
  readonly lines: readonly { readonly kind: string; readonly quantity: number }[];
}

/** Quote hours (Σ hour lines) against the job's time standard; over when strictly above. */
export function hoursOverStandard(input: TimeStandardInput) {
  const standard =
    timeStandardRule.hoursPerSensor[input.scope] * input.sensorCount + timeStandardRule.hoursPerStore;
  // Quantities have up to 3 decimals: add them up in thousandths, exactly.
  const milli = input.lines
    .filter((l) => l.kind === timeStandardRule.hourLine)
    .reduce((sum, l) => sum + Math.round(l.quantity * 1000), 0);
  return { quoted: milli / 1000, standard, over: milli > standard * 1000 };
}
