// R29 (domain/rules.md §29, P1) — "Quote not compliant: quote line above the internal time standard or supplier rules"
// (P-12, D-34 N1). Time standard per store (E12 AC3, D-40): partial N + 2 h, full 2N + 2 h, N = the job's sensors.
// The evaluator reads only this config. The other half of R29 (≥ 2 comparable quotes or a reason) is already a block
// at save in installers.approval.record (P-12).
export const timeStandardRule = {
  cite: 'R29 (domain/rules.md §29)',
  sopVersion: '1.0',
  /** Hours per sensor by job scope, plus the fixed hours per store. */
  hoursPerSensor: { partial: 1, full: 2 },
  hoursPerStore: 2,
  /** Quote lines that are hours. Per-unit, travel and extra lines are not checked against the time standard. */
  hourLine: 'hour',
  /**
   * Assumption: quotes are checked while the job is still being quoted (planned, quoting). Once the CEO approval is
   * recorded (P-11) the choice is made and the alert is withdrawn.
   */
  checkWhile: ['planned', 'quoting'],
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P1',
} as const;
