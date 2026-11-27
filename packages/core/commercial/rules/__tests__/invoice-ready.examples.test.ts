// R5 (domain/rules.md §5) — examples: input → expected decision, with the boundary (exactly 5 working days after
// acceptance) — ocs-sop-rule §3. GB calendar, no holidays in these weeks.
import { describe, expect, it } from 'vitest';
import { invoiceOverdue } from '../invoice-ready.ts';
import { invoiceReadyRule } from '../invoice-ready.config.ts';

// Accepted Monday 16 Nov 2026: 5 working days later is Monday 23 Nov.
const examples = [
  { name: 'not accepted', acceptedOn: null, today: '2026-12-31', hasInvoice: false, overdue: false },
  {
    name: '4 working days after acceptance',
    acceptedOn: '2026-11-16',
    today: '2026-11-20',
    hasInvoice: false,
    overdue: false,
  },
  {
    name: 'exactly 5 working days (boundary)',
    acceptedOn: '2026-11-16',
    today: '2026-11-23',
    hasInvoice: false,
    overdue: true,
  },
  {
    name: 'the weekend does not count',
    acceptedOn: '2026-11-16',
    today: '2026-11-22',
    hasInvoice: false,
    overdue: false,
  },
  {
    name: 'invoice recorded',
    acceptedOn: '2026-11-16',
    today: '2026-12-01',
    hasInvoice: true,
    overdue: false,
  },
] as const;

describe(`${invoiceReadyRule.cite} invoice-ready, no invoice`, () => {
  it.each(examples)('$name → overdue $overdue', ({ acceptedOn, today, hasInvoice, overdue }) => {
    expect(invoiceOverdue({ acceptedOn, today, hasInvoice, calendar: 'GB' })).toBe(overdue);
  });

  it('is P1, 5 working days after the "accepted" step', () => {
    expect(invoiceReadyRule).toMatchObject({ workingDays: 5, afterStep: 'accepted', level: 'P1' });
  });
});
