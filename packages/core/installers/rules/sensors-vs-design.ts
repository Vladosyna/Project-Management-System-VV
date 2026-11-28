// R12 (domain/rules.md §12) — evaluator. Reads only ./sensors-vs-design.config.ts. Decides; never throws.
import { sensorsVsDesignRule } from './sensors-vs-design.config.ts';

export interface SensorsVsDesignInput {
  /** The installer job's status. */
  readonly status: string;
  readonly jobSensors: number;
  /** Sensors of the store's active proposal; null when the store has none (nothing to compare). */
  readonly designSensors: number | null;
}

const open = new Set<string>(sensorsVsDesignRule.checkWhile);

export function sensorsDiffer(input: SensorsVsDesignInput): boolean {
  return open.has(input.status) && input.designSensors !== null && input.jobSensors !== input.designSensors;
}
