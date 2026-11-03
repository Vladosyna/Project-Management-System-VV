// SOP-DEL-01 §6 — evaluator. Reads only ./handover-checklist.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { handoverChecklistRule } from './handover-checklist.config.ts';

export interface HandoverChecklistInput {
  readonly value: number;
}

export function checkHandoverChecklist(input: HandoverChecklistInput): void {
  if (input.value > handoverChecklistRule.limit) {
    throw new RuleViolation(
      handoverChecklistRule.cite,
      `${String(input.value)} is above ${String(handoverChecklistRule.limit)}`,
    );
  }
}
