// org permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const orgPermissions = {
  createClient: permission('org.client.create', {
    description: 'Create a client (top of the SOP-DEL-02 hierarchy)',
    roles: ['director', 'admin'],
  }),
  clientList: permission('org.client.list', {
    description: 'See the client list',
    roles: ['director', 'pm', 'sales', 'rnd', 'finance', 'management', 'sponsor', 'admin'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
