// SOP-DEL-01 §8 — evaluator. Reads only ./intake-review.config.ts (and the §6 blocking list); refuses with
// RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { isBlocking } from './handover-checklist.ts';
import { intakeReviewRule } from './intake-review.config.ts';

export interface IntakeReviewInput {
  readonly decision: 'accepted' | 'accepted_with_conditions' | 'returned';
  readonly conditions: readonly { readonly itemCode: string; readonly deadline: string }[];
  readonly reasons: string | null;
  readonly assignedPmId: string | null;
  /** The decision day and the last allowed deadline (5 working days later), both YYYY-MM-DD. */
  readonly today: string;
  readonly latestDeadline: string;
}

export function checkIntakeReview(i: IntakeReviewInput): void {
  const no = (message: string) => new RuleViolation(intakeReviewRule.cite, message);
  const withConditions = i.decision === 'accepted_with_conditions';
  if (withConditions && i.conditions.length === 0) throw no('accepted with conditions needs at least one');
  if (!withConditions && i.conditions.length > 0) throw no(`a decision "${i.decision}" takes no conditions`);
  if (i.decision === 'returned' && !i.reasons) throw no('a return lists every gap');
  if (i.decision === 'returned' && i.assignedPmId) throw no('no Project Manager before acceptance');
  const blocking = i.conditions.filter((c) => isBlocking(c.itemCode)).map((c) => c.itemCode);
  if (blocking.length > 0) throw no(`${blocking.join(', ')} can never be a condition`);
  const late = i.conditions.filter((c) => c.deadline < i.today || c.deadline > i.latestDeadline);
  if (late.length > 0) {
    throw no(
      `deadlines run from ${i.today} to ${i.latestDeadline} (${String(intakeReviewRule.maxConditionWorkingDays)} working days): ${late.map((c) => c.itemCode).join(', ')}`,
    );
  }
}
