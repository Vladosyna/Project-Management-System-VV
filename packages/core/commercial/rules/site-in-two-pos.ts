// R13 (domain/rules.md §13, D-45 (2)) — evaluator. Reads only ./site-in-two-pos.config.ts. Decides; never throws.
import { siteInTwoPosRule } from './site-in-two-pos.config.ts';

/**
 * True when the site's confirmed, active client POs overlap: more than one for the same part of the work, or one for
 * all of the work next to any other. A hardware PO and an installation PO side by side are fine.
 */
export function inTwoPos(records: readonly { readonly kind: string; readonly part?: string }[]): boolean {
  const parts = records
    .filter((r) => r.kind === siteInTwoPosRule.kind)
    .map((r) => r.part ?? siteInTwoPosRule.wholePart);
  if (parts.includes(siteInTwoPosRule.wholePart)) return parts.length > siteInTwoPosRule.maxOpen;
  return new Set(parts).size < parts.length;
}
