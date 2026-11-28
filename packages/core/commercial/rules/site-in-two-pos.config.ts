// R13 (domain/rules.md §13, P0) — "Site in two POs: same site in more than one open PO". The evaluator reads only
// this config. A new version of the rule updates this file.
// D-45 (2): a PO covers all of the work or one part (hardware / installation); one store may hold one PO per part.
// Open POs overlap when they cover the same part, or when one covers all of the work.
export const siteInTwoPosRule = {
  cite: 'R13 (domain/rules.md §13)',
  sopVersion: '1.1',
  /** The record kind that is a PO (E13 AC1). */
  kind: 'client_po',
  /**
   * Open PO = a confirmed, active client PO record of the site. Assumption: V1 has no PO-closed status, so a PO stays
   * open until it is archived; an AI proposal does not count until a person confirms it (as for R14).
   */
  maxOpen: 1,
  /** The part that overlaps every other part (D-45). */
  wholePart: 'all',
  /** domain/rules.md level; sets the due date of the alert action (D-38). */
  level: 'P0',
} as const;
