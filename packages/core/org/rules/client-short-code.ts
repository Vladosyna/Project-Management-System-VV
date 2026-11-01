// SOP-DEL-02 §3 — evaluator. Reads only ./client-short-code.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { clientShortCodeRule } from './client-short-code.config.ts';

/** Throws unless `code` is 1 to 8 Latin capital letters. Callers upper-case the input first. */
export function checkClientShortCode(code: string): void {
  const { maxLetters, letters, cite } = clientShortCodeRule;
  let onlyLetters = true;
  for (const c of code) if (!letters.includes(c)) onlyLetters = false;
  if (code.length === 0 || code.length > maxLetters || !onlyLetters) {
    throw new RuleViolation(
      cite,
      `client short code "${code}" must be 1 to ${String(maxLetters)} letters A–Z`,
    );
  }
}
