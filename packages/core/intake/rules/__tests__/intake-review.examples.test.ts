// SOP-DEL-01 §8 — examples for the intake review rule.
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkIntakeReview, type IntakeReviewInput } from '../intake-review.ts';

const base: IntakeReviewInput = {
  decision: 'accepted_with_conditions',
  conditions: [{ itemCode: 'B2', deadline: '2026-11-25' }],
  reasons: null,
  assignedPmId: null,
  today: '2026-11-20',
  latestDeadline: '2026-11-27',
};
const check = (patch: Partial<IntakeReviewInput>) => () => {
  checkIntakeReview({ ...base, ...patch });
};

describe('SOP-DEL-01 §8 intake review', () => {
  it('accepts a non-blocking condition within 5 working days, and a plain acceptance', () => {
    expect(check({})).not.toThrow();
    expect(check({ decision: 'accepted', conditions: [] })).not.toThrow();
    expect(check({ decision: 'returned', conditions: [], reasons: 'A1 missing' })).not.toThrow();
  });

  it.each(['A1', 'A4', 'A6', 'C2', 'D1', 'F1'])('%s can never be a condition', (itemCode) => {
    expect(check({ conditions: [{ itemCode, deadline: '2026-11-25' }] })).toThrow(/can never be a condition/);
  });

  it('refuses a deadline after 5 working days or in the past', () => {
    expect(check({ conditions: [{ itemCode: 'B2', deadline: '2026-11-30' }] })).toThrow(RuleViolation);
    expect(check({ conditions: [{ itemCode: 'B2', deadline: '2026-11-19' }] })).toThrow(RuleViolation);
  });

  it('conditions only with "accepted with conditions"; a return lists gaps and assigns no PM', () => {
    expect(check({ conditions: [] })).toThrow(/at least one/);
    expect(check({ decision: 'accepted' })).toThrow(/takes no conditions/);
    expect(check({ decision: 'returned', conditions: [] })).toThrow(/every gap/);
    expect(check({ decision: 'returned', conditions: [], reasons: 'x', assignedPmId: 'p' })).toThrow(
      /Project Manager/,
    );
  });
});
