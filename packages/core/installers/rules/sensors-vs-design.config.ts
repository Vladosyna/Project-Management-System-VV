// R12 (domain/rules.md §12, P0) — "Quote ≠ design: quoted sensor count differs from current design". The current
// design is the store's active proposal (D-43); sensors are counted as in the time standard (D-42, CBox not counted).
// The evaluator reads only this config.
export const sensorsVsDesignRule = {
  cite: 'R12 (domain/rules.md §12)',
  sopVersion: '1.0',
  /** Jobs still open: a done, attended or cancelled job is history and is not compared. */
  checkWhile: ['planned', 'quoting', 'approved', 'scheduled'],
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P0',
} as const;
