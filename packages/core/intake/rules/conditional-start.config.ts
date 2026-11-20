// SOP-DEL-01 §9 — Conditional Start. "Only [the sponsor] can authorise Delivery to start before acceptance — in
// writing, in DingTalk, naming the missing items and a deadline of no more than 5 working days." Who may is the
// permission (role sponsor); the evaluator reads only this config.
export const conditionalStartRule = {
  cite: 'SOP-DEL-01 §9',
  sopVersion: '1.3',
  maxWorkingDays: 5,
} as const;
