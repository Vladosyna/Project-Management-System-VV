// R27 (domain/rules.md §27, P0) — "Negative margin: approved installer cost > client price for the site" (supplier
// rule P-03: installer price ≤ price to the client; D-34 N2). The evaluator reads only this config.
export const negativeMarginRule = {
  cite: 'R27 (domain/rules.md §27)',
  sopVersion: '1.0',
  /**
   * Where the client price for the site comes from, first kind found wins: the confirmed price-list price (E13 AC1);
   * without one, the confirmed client PO amounts, added up. Compared in EUR.
   * Known gap (review of #135): installer quotes are labour only, while a price list or PO may include hardware, so
   * today R27 fires late. Follow-up once the client quotation (D-40) is stored: 'client_quotation' becomes the first
   * source, and the installer cost is compared with its installation part only.
   */
  clientPriceFrom: ['price_list', 'client_po'],
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P0',
} as const;
