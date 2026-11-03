// R6 (domain/rules.md §6) — "Duplicate SN / MAC: block at save — same SN or MAC in two active records" (P0, V1;
// E4 AC1). What counts as the same is set here; the evaluator reads only this config. The database keeps the same
// rule as a backstop (migration 0007 partial unique indexes) for races and imports.
export const duplicateSnMacRule = {
  cite: 'R6 (domain/rules.md §6)',
  sopVersion: '1.0',
  /** Serial numbers are compared without regard to case: "abc123" and "ABC123" are one device. */
  snCaseInsensitive: true,
  /** MACs are compared in their stored spelling AA:BB:CC:DD:EE:FF (normalised before the check). */
  macNormalised: true,
} as const;
