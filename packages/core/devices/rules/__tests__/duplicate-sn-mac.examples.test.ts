// R6 (domain/rules.md §6) — examples: input → expected decision. Include the boundary cases (ocs-sop-rule §3).
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkDuplicateSnMac, type DuplicateSnMacInput } from '../duplicate-sn-mac.ts';
import { duplicateSnMacRule } from '../duplicate-sn-mac.config.ts';

const other = { sn: 'G6-0001', mac: 'AA:BB:CC:00:00:01', projectId: 'CLIENTA-ES-MAD-001' };
const examples: { name: string; input: DuplicateSnMacInput; decision: 'allowed' | 'blocked' }[] = [
  {
    name: 'nothing else active',
    input: { sn: 'G6-0001', mac: 'AA:BB:CC:00:00:01', active: [] },
    decision: 'allowed',
  },
  { name: 'same SN', input: { sn: 'G6-0001', mac: null, active: [other] }, decision: 'blocked' },
  { name: 'same SN, other case', input: { sn: 'g6-0001', mac: null, active: [other] }, decision: 'blocked' },
  {
    name: 'same MAC, other SN',
    input: { sn: 'G6-0002', mac: 'AA:BB:CC:00:00:01', active: [other] },
    decision: 'blocked',
  },
  {
    name: 'no MAC never matches',
    input: { sn: 'G6-0002', mac: null, active: [{ ...other, mac: null }] },
    decision: 'allowed',
  },
  {
    name: 'other SN, other MAC',
    input: { sn: 'G6-0002', mac: 'AA:BB:CC:00:00:02', active: [other] },
    decision: 'allowed',
  },
];

describe(`${duplicateSnMacRule.cite} duplicate SN / MAC`, () => {
  it.each(examples)('$name → $decision', ({ input, decision }) => {
    const run = () => {
      checkDuplicateSnMac(input);
    };
    if (decision === 'allowed') expect(run).not.toThrow();
    else expect(run).toThrow(RuleViolation);
  });
});
