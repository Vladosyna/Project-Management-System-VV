// R29 (domain/rules.md §29, P1; D-44) — "Quote above average: installer quote above the running average of confirmed
// quotes of the same country and scope, per sensor (labour ÷ sensors, total ÷ sensors), by more than the configured
// margin once enough quotes exist". Not the time standard (D-40). Thresholds: Vlad, 28 Nov. Reads only this config.
export const quoteAverageRule = {
  cite: 'R29 (domain/rules.md §29, D-44)',
  sopVersion: '1.1',
  /** Flag when either per-sensor figure is more than this many percent above the average. */
  marginPercent: 20,
  /** Compare only when at least this many other confirmed quotes of the same country and scope exist. */
  minPool: 3,
  /** Labour = the per-unit and per-hour lines; travel and extras count only in the total. */
  labourLines: ['unit', 'hour'],
  /**
   * Assumption: a quote is checked while its job is still being quoted (planned, quoting); once the CEO approval is
   * recorded (P-11) the choice is made. Every confirmed, active quote counts in the average.
   */
  checkWhile: ['planned', 'quoting'],
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P1',
} as const;
