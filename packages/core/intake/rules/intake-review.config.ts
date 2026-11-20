// SOP-DEL-01 §8 — intake review. "Accepted with conditions: only non-blocking items missing … Each is listed
// with a deadline of no more than 5 working days. Blocking items — A1, A4, A6, C2, D1, F1 — can never be
// conditional." "Returned: … The Delivery Director lists every gap." The evaluator reads only this config.
export const intakeReviewRule = {
  cite: 'SOP-DEL-01 §8',
  sopVersion: '1.3',
  maxConditionWorkingDays: 5,
} as const;
