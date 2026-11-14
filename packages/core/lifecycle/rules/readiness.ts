// R9 (domain/rules.md §9) — evaluator. Reads only ./readiness.config.ts. Decides; never throws.
import { readinessRule } from './readiness.config.ts';

export interface ReadinessInput {
  /** Working days from today to the planned installation date (0 on the day; negative once passed). */
  readonly workingDaysToInstallation: number | null;
  readonly reached: readonly string[];
  /** From the project's gate template, if it sets one. */
  readonly templateDays?: number | undefined;
}

export function readinessAtRisk(input: ReadinessInput): boolean {
  if (input.workingDaysToInstallation === null) return false;
  if (input.reached.includes(readinessRule.clearedBy)) return false;
  return input.workingDaysToInstallation <= (input.templateDays ?? readinessRule.defaultDays);
}
