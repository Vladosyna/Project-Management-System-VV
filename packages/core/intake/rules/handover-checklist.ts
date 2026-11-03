// SOP-DEL-01 §6 — evaluator. Reads only ./handover-checklist.config.ts. Lists what a package still lacks;
// the intake commands decide what to do with the gaps (submit refuses, review lists them).
import { handoverChecklistRule } from './handover-checklist.config.ts';

export type ItemCode = keyof typeof handoverChecklistRule.items;
export type Need = 'yes' | 'if_appl' | 'changes' | 'none';

export interface CoveredItem {
  readonly code: string;
  readonly status: 'provided' | 'na';
}

export interface Gap {
  readonly code: ItemCode;
  readonly need: Exclude<Need, 'none'>;
  /** Blocking under §8: can never be accepted as a condition. */
  readonly blocking: boolean;
  readonly why: 'missing' | 'na_not_allowed';
}

export const itemCodes = Object.keys(handoverChecklistRule.items) as ItemCode[];

export function needOf(code: ItemCode, tier: 'full' | 'light'): Need {
  return handoverChecklistRule.items[code][tier];
}

export function isBlocking(code: string): boolean {
  return (handoverChecklistRule.blocking as readonly string[]).includes(code);
}

/**
 * Gaps of a package of this tier: an item it needs that has no row, or a "Yes" item marked N/A ("Yes =
 * mandatory"). "If appl." and "Changes" items may be N/A with a reason (the reason is checked on the row).
 */
export function handoverGaps(tier: 'full' | 'light', covered: readonly CoveredItem[]): Gap[] {
  const byCode = new Map(covered.map((c) => [c.code, c.status]));
  const gaps: Gap[] = [];
  for (const code of itemCodes) {
    const need = needOf(code, tier);
    if (need === 'none') continue;
    const status = byCode.get(code);
    if (status === undefined) gaps.push({ code, need, blocking: isBlocking(code), why: 'missing' });
    else if (status === 'na' && need === 'yes') {
      gaps.push({ code, need, blocking: isBlocking(code), why: 'na_not_allowed' });
    }
  }
  return gaps;
}
