// commercial permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const commercialPermissions = {
  proposeRecord: permission('commercial.record.propose', {
    description:
      'Record a client PO, DPIA status, client invoice or price-list price on a site; amounts in the original currency and EUR. From an AI agent it stays a proposal until a PM confirms it.',
    roles: ['director', 'pm', 'finance', 'sponsor'],
  }),
  confirmRecord: permission('commercial.record.confirm', {
    description:
      'Confirm a commercial record an AI agent proposed (a person only, never an agent): money data is applied only when confirmed.',
    roles: ['director', 'pm', 'finance'],
  }),
  siteCommercial: permission('commercial.site.read', {
    description:
      'The commercial records of one site (PO, DPIA, invoice, price list): confirmed and proposed, with amounts in original currency and EUR.',
    roles: ['director', 'pm', 'finance', 'sponsor', 'management'],
  }),
  archiveRecord: permission('commercial.record.archive', {
    description: 'Archive a wrong or replaced commercial record of a site, with a reason; never deleted.',
    roles: ['director', 'pm', 'finance'],
  }),
  gaps: permission('commercial.gaps.read', {
    description:
      'For the hourly alert run: every active site with its commercial gaps — installed without a confirmed PO (R14) or without an approved DPIA (R24), without an owner (R26), accepted 5 working days ago without a confirmed client invoice (R5), an approved installer cost above the client price (R27), and more than one open client PO (R13). A batch PO or invoice counts for every store linked to it (D-45).',
    roles: ['system'],
  }),
  portfolio: permission('commercial.portfolio.read', {
    description:
      'Commercial status of every site the actor may see: client PO, DPIA, invoices, price list in EUR, and AI proposals waiting for confirmation.',
    roles: ['director', 'pm', 'finance', 'sponsor', 'management'],
  }),
  proposeCountry: permission('commercial.country.propose', {
    description:
      "Record a client's DPIA or LPA for a whole country (D-45): it covers every store of that client there. Replaces the previous one, which is archived. From an AI agent it stays a proposal until a person confirms it.",
    roles: ['director', 'pm', 'finance', 'sponsor'],
  }),
  confirmCountry: permission('commercial.country.confirm', {
    description: 'Confirm a country DPIA or LPA an AI agent proposed (a person only, never an agent).',
    roles: ['director', 'pm', 'finance'],
  }),
  weeklyChanges: permission('commercial.weeklyChanges.read', {
    description:
      "Friday weekly report per client (E11 AC1, D-44): the client's commercial records (PO, invoice, DPIA, price list) added, confirmed or archived in one week",
    roles: ['director', 'pm', 'finance', 'management', 'sponsor'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
