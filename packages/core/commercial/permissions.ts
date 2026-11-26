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
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
