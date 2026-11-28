// R32 (domain/rules.md §32, D-34 C3; E3 AC6) — examples: an installer may be booked (job → scheduled) only once the
// project's readiness is passed; every other status change is not a booking.
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkBookingReadiness } from '../booking-readiness.ts';
import { bookingReadinessRule } from '../booking-readiness.config.ts';

const examples = [
  { input: { status: 'scheduled', readinessPassed: true }, decision: 'allowed' },
  { input: { status: 'scheduled', readinessPassed: false }, decision: 'blocked' },
  { input: { status: 'cancelled', readinessPassed: false }, decision: 'allowed' },
  { input: { status: 'done', readinessPassed: false }, decision: 'allowed' },
] as const;

describe(`${bookingReadinessRule.cite} installer booked before readiness`, () => {
  it.each(examples)(
    '$input.status, readiness passed $input.readinessPassed → $decision',
    ({ input, decision }) => {
      const run = () => {
        checkBookingReadiness(input);
      };
      if (decision === 'allowed') expect(run).not.toThrow();
      else expect(run).toThrow(RuleViolation);
    },
  );
});
