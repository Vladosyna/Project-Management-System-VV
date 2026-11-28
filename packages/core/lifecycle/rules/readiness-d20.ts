// R32 (domain/rules.md §32, D-47) — evaluator. Reads only ./readiness-d20.config.ts. Decides; never throws.
import { readinessD20Rule } from './readiness-d20.config.ts';

export interface ReadinessD20Input {
  /** Working days from today to the planned installation date (0 on the day; negative once passed); null without one. */
  readonly workingDaysToInstallation: number | null;
  readonly reached: readonly string[];
}

export function readinessMissingAtD20(input: ReadinessD20Input): boolean {
  if (input.workingDaysToInstallation === null) return false;
  if (input.reached.includes(readinessD20Rule.clearedBy)) return false;
  if (input.reached.includes(readinessD20Rule.alertEndsAt)) return false;
  return input.workingDaysToInstallation <= readinessD20Rule.days;
}
