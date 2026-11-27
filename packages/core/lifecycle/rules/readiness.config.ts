// R9 (domain/rules.md §9, P0) — "Readiness / go-no-go not passed: ≤ configured working days to installation
// (a client template, e.g. D−2), readiness not confirmed". The evaluator reads only this config.
export const readinessRule = {
  cite: 'R9 (domain/rules.md §9)',
  sopVersion: '1.0',
  /**
   * Working days before installation by which readiness must be confirmed, when the gate template gives none.
   * Assumption: SOP-DEL-04 step 6 holds the last readiness check 7 days before installation; a template's
   * readinessDays (e.g. 2 for a D−2 check) overrides it.
   */
  defaultDays: 7,
  /** The step that clears the rule. */
  clearedBy: 'readiness_confirmed',
  /**
   * The step after which the hourly R9 alert no longer fires. Vlad, 27 Nov: R9 is about readiness before
   * installation; once "installed" is recorded it no longer applies.
   */
  alertEndsAt: 'installed',
} as const;
