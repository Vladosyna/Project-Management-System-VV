// R40 (domain/rules.md §40, P1; D-45 (4)) — "PO without LPA: a confirmed client PO for a store whose country has no
// approved LPA, for clients that agree the LPA per country". An alert, never a block: PO and LPA are often settled by
// hand at the same time (Vlad, 28 Nov). The evaluator reads only this config.
export const poWithoutLpaRule = {
  cite: 'R40 (domain/rules.md §40, D-45)',
  sopVersion: '1.0',
  /** Only clients that agree DPIA and LPA once per country (client.compliance_scope). */
  appliesToScope: 'country',
  level: 'P1',
} as const;
