// R6 (domain/rules.md §6) — evaluator. Reads only ./duplicate-sn.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { duplicateSnRule } from './duplicate-sn.config.ts';

export interface DuplicateSnInput {
  /** The SN of the device being saved. */
  readonly sn: string;
  /** Active (not archived) devices that may share its SN, as the repository found them. */
  readonly active: readonly { readonly sn: string; readonly projectId: string }[];
}

const sameSn = (a: string, b: string) =>
  duplicateSnRule.snCaseInsensitive ? a.toUpperCase() === b.toUpperCase() : a === b;

export function checkDuplicateSn(input: DuplicateSnInput): void {
  const clash = input.active.find((other) => sameSn(other.sn, input.sn));
  if (clash) {
    throw new RuleViolation(
      duplicateSnRule.cite,
      `SN ${input.sn} is already registered on ${clash.projectId}`,
    );
  }
}
