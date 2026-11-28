// R32 (domain/rules.md §32, P1; D-47, Vlad 28 Nov) — "Readiness not confirmed at D−20": a project with a planned
// installation date whose readiness is not confirmed 20 working days before it (the project country's calendar, as for
// R9) alerts the PM. Not a block: an installer may be booked before readiness (D-47 replaces the earlier block at save).
// The evaluator reads only this config.
export const readinessD20Rule = {
  cite: 'R32 (domain/rules.md §32, D-47)',
  sopVersion: '1.0',
  /** Working days before the planned installation from which readiness must be confirmed. */
  days: 20,
  /** The step that clears the rule (the same as R9). */
  clearedBy: 'readiness_confirmed',
  /** Once installed, readiness no longer applies (as for R9). */
  alertEndsAt: 'installed',
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P1',
} as const;
