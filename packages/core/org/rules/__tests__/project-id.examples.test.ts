// SOP-DEL-02 §3 — examples: input → expected decision. Include the boundary cases (exactly at the limit,
// one over, N/A without a reason …) — ocs-sop-rule §3.
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkProjectId } from '../project-id.ts';
import { projectIdRule } from '../project-id.config.ts';

const examples = [
  { input: { value: 5 }, decision: 'allowed' },
  { input: { value: 6 }, decision: 'blocked' },
] as const;

describe(`${projectIdRule.cite} project id`, () => {
  it.each(examples)('$input.value → $decision', ({ input, decision }) => {
    const run = () => {
      checkProjectId(input);
    };
    if (decision === 'allowed') expect(run).not.toThrow();
    else expect(run).toThrow(RuleViolation);
  });
});
