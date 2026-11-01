// SOP-DEL-02 §3 — examples: input → expected decision, with the boundaries (exactly 8 letters, 9, empty,
// a digit, a non-Latin letter) — ocs-sop-rule §3.
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkClientShortCode } from '../client-short-code.ts';
import { clientShortCodeRule } from '../client-short-code.config.ts';

const examples = [
  { code: 'CLIENTA', decision: 'allowed' },
  { code: 'A', decision: 'allowed' },
  { code: 'ABCDEFGH', decision: 'allowed' },
  { code: 'ABCDEFGHI', decision: 'blocked' },
  { code: '', decision: 'blocked' },
  { code: 'CLIENT1', decision: 'blocked' },
  { code: 'CLIENT-A', decision: 'blocked' },
  { code: 'KLIENTÄ', decision: 'blocked' },
  { code: '客户', decision: 'blocked' },
] as const;

describe(`${clientShortCodeRule.cite} client short code`, () => {
  it.each(examples)('"$code" → $decision', ({ code, decision }) => {
    const run = () => {
      checkClientShortCode(code);
    };
    if (decision === 'allowed') expect(run).not.toThrow();
    else expect(run).toThrow(expect.objectContaining({ clause: 'SOP-DEL-02 §3' }) as RuleViolation);
  });
});
