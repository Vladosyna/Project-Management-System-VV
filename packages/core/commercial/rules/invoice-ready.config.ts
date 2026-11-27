// R5 (domain/rules.md §5, P1) — "Invoice-ready, no invoice: no invoice 5 working days after acceptance gate".
// The evaluator reads only this config. A new version of the rule updates this file.
export const invoiceReadyRule = {
  cite: 'R5 (domain/rules.md §5)',
  sopVersion: '1.0',
  /** Working days after acceptance by which the client invoice must be recorded. */
  workingDays: 5,
  /** The acceptance gate: the E3 base step "accepted" (acceptance evidence recorded, E3 AC4). */
  afterStep: 'accepted',
  /**
   * What clears the rule: a confirmed client invoice record (E13), any status (issued or paid). Assumption: an AI
   * proposal does not count until a person confirms it, as for R14/R24.
   */
  clearedBy: 'client_invoice',
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P1',
} as const;
