// quotations — Client quotations: settings per client × country, model prices, drafts by the time standard (D-40, E15)
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { quotationsPermissions } from './permissions.ts';
export { saveConfig } from './commands/save-config.ts';
export { savePrice } from './commands/save-price.ts';
