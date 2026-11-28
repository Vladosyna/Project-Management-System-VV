// R32 (domain/rules.md §32, P0; D-34 C3; E3 AC6) — "Installer booked before readiness: block at save — installer
// booking while readiness not passed". The evaluator reads only this config.
export const bookingReadinessRule = {
  cite: 'R32 (domain/rules.md §32, D-34 C3)',
  sopVersion: '1.0',
  /** Booking the installer = moving the job to this status (with its date). */
  booking: 'scheduled',
  /**
   * Readiness passed = the project's base step "readiness_confirmed" is recorded (lifecycle, R9 clears on the same
   * step). Assumption: a client gate named as a readiness check (e.g. a D−2 check) is not required here as well.
   */
} as const;
