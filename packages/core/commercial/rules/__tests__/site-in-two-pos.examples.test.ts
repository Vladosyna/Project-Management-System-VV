// R13 (domain/rules.md §13) — examples: input → expected decision, with the boundary (exactly one open PO is fine)
// — ocs-sop-rule §3. Input: the site's confirmed, active commercial records.
import { describe, expect, it } from 'vitest';
import { inTwoPos } from '../site-in-two-pos.ts';
import { siteInTwoPosRule } from '../site-in-two-pos.config.ts';

const po = { kind: 'client_po' };
const examples = [
  { name: 'no PO', records: [], flagged: false },
  { name: 'one PO (boundary)', records: [po], flagged: false },
  { name: 'two POs', records: [po, po], flagged: true },
  {
    name: 'one PO and other records',
    records: [po, { kind: 'client_invoice' }, { kind: 'price_list' }],
    flagged: false,
  },
  {
    name: 'hardware PO and installation PO (D-45)',
    records: [
      { ...po, part: 'hardware' },
      { ...po, part: 'installation' },
    ],
    flagged: false,
  },
  {
    name: 'two hardware POs',
    records: [
      { ...po, part: 'hardware' },
      { ...po, part: 'hardware' },
    ],
    flagged: true,
  },
  {
    name: 'a PO for all of the work and an installation PO',
    records: [
      { ...po, part: 'all' },
      { ...po, part: 'installation' },
    ],
    flagged: true,
  },
] as const;

describe(`${siteInTwoPosRule.cite} site in two POs`, () => {
  it.each(examples)('$name → flagged $flagged', ({ records, flagged }) => {
    expect(inTwoPos(records)).toBe(flagged);
  });

  it('is P0; more than one open client PO', () => {
    expect(siteInTwoPosRule).toMatchObject({ kind: 'client_po', maxOpen: 1, level: 'P0' });
  });
});
