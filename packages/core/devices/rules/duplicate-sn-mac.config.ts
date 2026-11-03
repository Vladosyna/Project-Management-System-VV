// R6 (domain/rules.md §6) — duplicate sn mac. The numbers, item codes and lists of the clause live here;
// the evaluator reads only this config. A new SOP version updates this file (sop-index.md).
export const duplicateSnMacRule = {
  cite: 'R6 (domain/rules.md §6)',
  sopVersion: '1.0',
  /** Example parameter: replace with what the clause names. */
  limit: 5,
} as const;
