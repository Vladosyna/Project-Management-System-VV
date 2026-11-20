// SOP-DEL-01 §9 — evaluator. Reads only ./conditional-start.config.ts; refuses with RuleViolation citing it.
import { RuleViolation } from '../../kernel/index.ts';
import { conditionalStartRule } from './conditional-start.config.ts';

export interface ConditionalStartInput {
  /** YYYY-MM-DD: the deadline, today, and the last allowed day (5 working days after today). */
  readonly deadline: string;
  readonly today: string;
  readonly latestDeadline: string;
}

export function checkConditionalStart(i: ConditionalStartInput): void {
  if (i.deadline < i.today || i.deadline > i.latestDeadline) {
    throw new RuleViolation(
      conditionalStartRule.cite,
      `the deadline runs from ${i.today} to ${i.latestDeadline} (${String(conditionalStartRule.maxWorkingDays)} working days)`,
    );
  }
}
