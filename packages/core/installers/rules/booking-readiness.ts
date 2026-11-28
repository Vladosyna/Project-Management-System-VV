// R32 (domain/rules.md §32, D-34 C3) — evaluator. Reads only ./booking-readiness.config.ts; refuses with RuleViolation
// citing the clause.
import { RuleViolation } from '../../kernel/index.ts';
import { bookingReadinessRule } from './booking-readiness.config.ts';

export interface BookingReadinessInput {
  /** The status the job is moving to. */
  readonly status: string;
  readonly readinessPassed: boolean;
}

export function checkBookingReadiness(input: BookingReadinessInput): void {
  if (input.status === bookingReadinessRule.booking && !input.readinessPassed) {
    throw new RuleViolation(
      bookingReadinessRule.cite,
      'the installer cannot be booked before the project readiness is confirmed',
    );
  }
}
