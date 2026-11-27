// quotations permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const quotationsPermissions = {
  saveConfig: permission('quotations.config.save', {
    description:
      "Set a client's quotation settings for one country: currency, hourly rate, tax mode (reverse charge or DDP with local VAT), seller, buyer, bank details, terms and number prefix. Replaces the active settings.",
    roles: ['director', 'sponsor'],
  }),
  savePrice: permission('quotations.price.save', {
    description: "Set a sensor model's unit price for a client in one currency; replaces the active price.",
    roles: ['director', 'sponsor'],
  }),
  draftQuotation: permission('quotations.quotation.draft', {
    description:
      "Draft a client quotation for a batch of stores: sensors (model price × count) and installation (hours × rate) as separate lines; hours by the time standard (partial N + 2, full 2N + 2 per store), an override needs a reason; tax by the country's settings. A draft only; a person sends it.",
    roles: ['director', 'pm', 'sales'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
