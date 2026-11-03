// R6 (domain/rules.md §6) — evaluator. Reads only ./duplicate-sn-mac.config.ts; refuses with RuleViolation citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { duplicateSnMacRule } from './duplicate-sn-mac.config.ts';

export interface DuplicateSnMacInput {
  /** The device being saved. */
  readonly sn: string;
  readonly mac: string | null;
  /** Active (not archived) devices that share its SN or MAC, as the repository found them. */
  readonly active: readonly {
    readonly sn: string;
    readonly mac: string | null;
    readonly projectId: string;
  }[];
}

const sameSn = (a: string, b: string) =>
  duplicateSnMacRule.snCaseInsensitive ? a.toUpperCase() === b.toUpperCase() : a === b;

export function checkDuplicateSnMac(input: DuplicateSnMacInput): void {
  for (const other of input.active) {
    if (sameSn(other.sn, input.sn)) {
      throw new RuleViolation(
        duplicateSnMacRule.cite,
        `SN ${input.sn} is already registered on ${other.projectId}`,
      );
    }
    if (input.mac !== null && other.mac === input.mac) {
      throw new RuleViolation(
        duplicateSnMacRule.cite,
        `MAC ${input.mac} is already registered on ${other.projectId}`,
      );
    }
  }
}
