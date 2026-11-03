// SOP-DEL-01 §3 — evaluator. Reads only ./package-tier.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { packageTierRule } from './package-tier.config.ts';

export interface PackageTierInput {
  readonly value: number;
}

export function checkPackageTier(input: PackageTierInput): void {
  if (input.value > packageTierRule.limit) {
    throw new RuleViolation(
      packageTierRule.cite,
      `${String(input.value)} is above ${String(packageTierRule.limit)}`,
    );
  }
}
