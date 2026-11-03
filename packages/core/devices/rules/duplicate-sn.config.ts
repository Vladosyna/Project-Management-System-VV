// R6 (domain/rules.md §6) — "Duplicate SN: block at save — same SN (any case) in two active records. Not the MAC:
// it can change on restart (D-29)" (P0, V1; E4 AC1). What counts as the same is set here; the evaluator reads only
// this config. The database keeps the same rule as a backstop (unique index on upper(sn) among active devices).
export const duplicateSnRule = {
  cite: 'R6 (domain/rules.md §6)',
  sopVersion: '1.0',
  /** Serial numbers are compared without regard to case: "abc123" and "ABC123" are one device. */
  snCaseInsensitive: true as boolean,
} as const;
