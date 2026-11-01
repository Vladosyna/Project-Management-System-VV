// SOP-DEL-02 §3 — evaluator. Reads only ./client-short-code.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { clientShortCodeRule } from './client-short-code.config.ts';

export interface ClientShortCodeInput {
  readonly value: number;
}

export function checkClientShortCode(input: ClientShortCodeInput): void {
  if (input.value > clientShortCodeRule.limit) {
    throw new RuleViolation(
      clientShortCodeRule.cite,
      `${String(input.value)} is above ${String(clientShortCodeRule.limit)}`,
    );
  }
}
