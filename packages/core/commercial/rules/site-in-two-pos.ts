// R13 (domain/rules.md §13) — evaluator. Reads only ./site-in-two-pos.config.ts. Decides; never throws.
import { siteInTwoPosRule } from './site-in-two-pos.config.ts';

/** True when the site's confirmed, active records hold more than one client PO. */
export function inTwoPos(records: readonly { readonly kind: string }[]): boolean {
  return records.filter((r) => r.kind === siteInTwoPosRule.kind).length > siteInTwoPosRule.maxOpen;
}
