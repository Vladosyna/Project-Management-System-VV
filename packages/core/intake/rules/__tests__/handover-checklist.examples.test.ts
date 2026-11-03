// SOP-DEL-01 §6 — examples: input → expected decision. Include the boundary cases (exactly at the limit,
// one over, N/A without a reason …) — ocs-sop-rule §3.
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkHandoverChecklist } from '../handover-checklist.ts';
import { handoverChecklistRule } from '../handover-checklist.config.ts';

const examples = [
  { input: { value: 5 }, decision: 'allowed' },
  { input: { value: 6 }, decision: 'blocked' },
] as const;

describe(`${handoverChecklistRule.cite} handover checklist`, () => {
  it.each(examples)('$input.value → $decision', ({ input, decision }) => {
    const run = () => {
      checkHandoverChecklist(input);
    };
    if (decision === 'allowed') expect(run).not.toThrow();
    else expect(run).toThrow(RuleViolation);
  });
});
