// work permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const workPermissions = {
  createAction: permission('work.action.create', {
    description: 'Create an action with one owner and a due date (SOP-DEL-03)',
    roles: ['director', 'pm', 'sales', 'rnd', 'sponsor'],
  }),
  completeAction: permission('work.action.complete', {
    description: 'Mark an action done (its owner, or a director or PM)',
    roles: ['director', 'pm', 'sales', 'rnd', 'sponsor'],
  }),
  openActions: permission('work.action.list', {
    description: 'See open actions by project or owner',
    roles: ['director', 'pm', 'sales', 'rnd', 'finance', 'management', 'sponsor', 'admin'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
