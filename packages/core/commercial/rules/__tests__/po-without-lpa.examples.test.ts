// R40 (domain/rules.md §40, D-45) — examples: input → expected decision — ocs-sop-rule §3.
import { describe, expect, it } from 'vitest';
import { poWithoutLpa } from '../po-without-lpa.ts';
import { poWithoutLpaRule } from '../po-without-lpa.config.ts';

const examples = [
  {
    name: 'per-country client, PO, no LPA',
    complianceScope: 'country',
    hasConfirmedPo: true,
    countryLpaApproved: false,
    flagged: true,
  },
  {
    name: 'per-country client, PO, LPA approved',
    complianceScope: 'country',
    hasConfirmedPo: true,
    countryLpaApproved: true,
    flagged: false,
  },
  {
    name: 'per-country client, no PO yet',
    complianceScope: 'country',
    hasConfirmedPo: false,
    countryLpaApproved: false,
    flagged: false,
  },
  {
    name: 'per-store client: R40 does not apply',
    complianceScope: 'site',
    hasConfirmedPo: true,
    countryLpaApproved: false,
    flagged: false,
  },
] as const;

describe(`${poWithoutLpaRule.cite} PO without LPA`, () => {
  it.each(examples)('$name → flagged $flagged', ({ flagged, ...input }) => {
    expect(poWithoutLpa(input)).toBe(flagged);
  });

  it('is a P1 alert, never a block', () => {
    expect(poWithoutLpaRule).toMatchObject({ appliesToScope: 'country', level: 'P1' });
  });
});
