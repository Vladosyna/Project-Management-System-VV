// SOP-DEL-01 §6, §8 — examples: package content → gaps, including the boundary cases (ocs-sop-rule §3).
import { describe, expect, it } from 'vitest';
import { handoverGaps, isBlocking, itemCodes, needOf, type CoveredItem } from '../handover-checklist.ts';
import { handoverChecklistRule } from '../handover-checklist.config.ts';

const all = (status: 'provided' | 'na'): CoveredItem[] => itemCodes.map((code) => ({ code, status }));
const without = (items: CoveredItem[], ...codes: string[]) => items.filter((i) => !codes.includes(i.code));
const gapCodes = (tier: 'full' | 'light', items: CoveredItem[]) =>
  handoverGaps(tier, items).map((g) => g.code);

describe(`${handoverChecklistRule.cite} handover checklist`, () => {
  it('has the 33 items of the v1.3 table (A1–A8, B1–B4, C1–C6, D1–D3, E1–E6, F1–F5, G1)', () => {
    expect(itemCodes).toHaveLength(33);
  });

  it('transcribes the table: a few cells checked by hand', () => {
    expect([needOf('A5', 'full'), needOf('A5', 'light')]).toEqual(['yes', 'none']);
    expect([needOf('B1', 'full'), needOf('B1', 'light')]).toEqual(['yes', 'changes']);
    expect([needOf('C6', 'full'), needOf('C6', 'light')]).toEqual(['if_appl', 'none']);
    expect([needOf('F4', 'full'), needOf('F4', 'light')]).toEqual(['if_appl', 'if_appl']);
  });

  it('a complete package has no gaps', () => {
    expect(handoverGaps('full', all('provided'))).toEqual([]);
  });

  it('a missing item is a gap; a missing blocking item is a blocking gap (§8)', () => {
    const gaps = handoverGaps('full', without(all('provided'), 'A3', 'A4'));
    expect(gaps).toEqual([
      { code: 'A3', need: 'yes', blocking: false, why: 'missing' },
      { code: 'A4', need: 'yes', blocking: true, why: 'missing' },
    ]);
  });

  it('"Yes" items cannot be N/A; "If appl." and "Changes" items can', () => {
    const items = all('provided').map((i) =>
      ['A1', 'B3', 'B1'].includes(i.code) ? { ...i, status: 'na' as const } : i,
    );
    expect(gapCodes('full', items)).toEqual(['A1', 'B1']); // B3 is "If appl." in Full
    expect(gapCodes('light', items)).toEqual(['A1']); // B1 is "Changes" in Light
  });

  it('Light needs fewer items: A5, C6 and E2 are not required, B1 may be N/A (no change)', () => {
    const items = without(all('provided'), 'A5', 'C6', 'E2').map((i) =>
      i.code === 'B1' ? { ...i, status: 'na' as const } : i,
    );
    expect(gapCodes('light', items)).toEqual([]);
  });

  it('the blocking items are exactly A1, A4, A6, C2, D1, F1', () => {
    expect(itemCodes.filter(isBlocking)).toEqual(['A1', 'A4', 'A6', 'C2', 'D1', 'F1']);
  });
});
