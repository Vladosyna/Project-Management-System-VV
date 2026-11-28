// R13 (domain/rules.md §13, P0) — "Site in two POs: same site in more than one open PO". The evaluator reads only
// this config. A new version of the rule updates this file.
// Known gaps (review of #141, D-44): a batch PO now links further stores (commercial_record_site_link, #139); a store
// must count each batch PO it is linked to as well as its own — next PR. If clients later send separate hardware and
// installation POs, R13 becomes "more than one open PO of the same type".
export const siteInTwoPosRule = {
  cite: 'R13 (domain/rules.md §13)',
  sopVersion: '1.0',
  /** The record kind that is a PO (E13 AC1). */
  kind: 'client_po',
  /**
   * Open PO = a confirmed, active client PO record of the site. Assumption: V1 has no PO-closed status, so a PO stays
   * open until it is archived; an AI proposal does not count until a person confirms it (as for R14).
   */
  maxOpen: 1,
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P0',
} as const;
