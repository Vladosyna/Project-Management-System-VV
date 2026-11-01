// SOP-DEL-02 §3 — evaluator. Reads only ./project-id.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { projectIdRule } from './project-id.config.ts';

export interface ProjectIdInput {
  readonly value: number;
}

export function checkProjectId(input: ProjectIdInput): void {
  if (input.value > projectIdRule.limit) {
    throw new RuleViolation(
      projectIdRule.cite,
      `${String(input.value)} is above ${String(projectIdRule.limit)}`,
    );
  }
}
