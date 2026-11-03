// R6 (domain/rules.md §6) — evaluator. Reads only ./duplicate-sn-mac.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { duplicateSnMacRule } from './duplicate-sn-mac.config.ts';

export interface DuplicateSnMacInput {
  readonly value: number;
}

export function checkDuplicateSnMac(input: DuplicateSnMacInput): void {
  if (input.value > duplicateSnMacRule.limit) {
    throw new RuleViolation(
      duplicateSnMacRule.cite,
      `${String(input.value)} is above ${String(duplicateSnMacRule.limit)}`,
    );
  }
}
