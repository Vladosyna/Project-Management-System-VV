// org — clients, programmes, projects/sites and partners (SOP-DEL-02 §3, E1).
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { orgPermissions } from './permissions.ts';
export { createClient } from './commands/create-client.ts';
export { clientList } from './queries/client-list.ts';
