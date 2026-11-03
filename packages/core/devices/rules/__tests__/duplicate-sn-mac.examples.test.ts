// R6 (domain/rules.md §6) — examples: input → expected decision. Include the boundary cases (exactly at the limit,
// one over, N/A without a reason …) — ocs-sop-rule §3.
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkDuplicateSnMac } from '../duplicate-sn-mac.ts';
import { duplicateSnMacRule } from '../duplicate-sn-mac.config.ts';

const examples = [
  { input: { value: 5 }, decision: 'allowed' },
  { input: { value: 6 }, decision: 'blocked' },
] as const;

describe(`${duplicateSnMacRule.cite} duplicate sn mac`, () => {
  it.each(examples)('$input.value → $decision', ({ input, decision }) => {
    const run = () => {
      checkDuplicateSnMac(input);
    };
    if (decision === 'allowed') expect(run).not.toThrow();
    else expect(run).toThrow(RuleViolation);
  });
});
