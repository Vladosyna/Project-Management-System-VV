// SOP-DEL-01 §9 — examples for the Conditional Start deadline.
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkConditionalStart } from '../conditional-start.ts';

const at = (deadline: string) => () => {
  checkConditionalStart({ deadline, today: '2026-11-20', latestDeadline: '2026-11-27' });
};

describe('SOP-DEL-01 §9 Conditional Start', () => {
  it('takes a deadline from today up to 5 working days later', () => {
    expect(at('2026-11-20')).not.toThrow();
    expect(at('2026-11-27')).not.toThrow();
  });
  it('refuses a deadline in the past or beyond 5 working days', () => {
    expect(at('2026-11-19')).toThrow(RuleViolation);
    expect(at('2026-11-30')).toThrow(/SOP-DEL-01 §9.*2026-11-27/);
  });
});
