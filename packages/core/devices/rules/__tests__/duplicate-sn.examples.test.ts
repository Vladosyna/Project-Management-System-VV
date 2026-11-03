// R6 (domain/rules.md §6) — examples: input → expected decision. Include the boundary cases (ocs-sop-rule §3).
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkDuplicateSn, type DuplicateSnInput } from '../duplicate-sn.ts';
import { duplicateSnRule } from '../duplicate-sn.config.ts';

const other = { sn: 'G6-0001', projectId: 'CLIENTA-ES-MAD-001' };
const examples: { name: string; input: DuplicateSnInput; decision: 'allowed' | 'blocked' }[] = [
  { name: 'nothing else active', input: { sn: 'G6-0001', active: [] }, decision: 'allowed' },
  { name: 'same SN', input: { sn: 'G6-0001', active: [other] }, decision: 'blocked' },
  { name: 'same SN, other case', input: { sn: 'g6-0001', active: [other] }, decision: 'blocked' },
  { name: 'other SN', input: { sn: 'G6-0002', active: [other] }, decision: 'allowed' },
  {
    name: 'SN that only contains the other',
    input: { sn: 'G6-00011', active: [other] },
    decision: 'allowed',
  },
];

describe(`${duplicateSnRule.cite} duplicate SN`, () => {
  it.each(examples)('$name → $decision', ({ input, decision }) => {
    const run = () => {
      checkDuplicateSn(input);
    };
    if (decision === 'allowed') expect(run).not.toThrow();
    else expect(run).toThrow(RuleViolation);
  });
});
