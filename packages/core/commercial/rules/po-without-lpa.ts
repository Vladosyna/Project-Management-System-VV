// R40 (domain/rules.md §40, D-45) — evaluator. Reads only ./po-without-lpa.config.ts. Decides; never throws.
import { poWithoutLpaRule } from './po-without-lpa.config.ts';

export function poWithoutLpa(input: {
  readonly complianceScope: string;
  readonly hasConfirmedPo: boolean;
  readonly countryLpaApproved: boolean;
}): boolean {
  return (
    input.complianceScope === poWithoutLpaRule.appliesToScope &&
    input.hasConfirmedPo &&
    !input.countryLpaApproved
  );
}
