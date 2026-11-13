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
  addComment: permission('work.comment.add', {
    description: 'Comment on a project, @mentioning staff (E5 AC2)',
    roles: ['director', 'pm', 'sales', 'rnd', 'sponsor', 'finance'],
  }),
  commentToAction: permission('work.comment.toAction', {
    description: 'Turn a comment into an action with an owner and a due date (E5 AC2)',
    roles: ['director', 'pm'],
  }),
  recordVisit: permission('work.visit.record', {
    description: 'Record a site visit and its action items the same day (SOP-DEL-03 §5.1)',
    roles: ['director', 'pm', 'rnd'],
  }),
  projectFeed: permission('work.feed.list', {
    description: "See a project's feed: actions, comments and visits with their sources (E5 AC4)",
    roles: ['director', 'pm', 'sales', 'rnd', 'finance', 'management', 'sponsor', 'admin'],
  }),
  staffList: permission('work.staff.list', {
    description: 'See active staff to @mention or assign (E5 AC2)',
    roles: ['director', 'pm', 'sales', 'rnd', 'finance', 'management', 'sponsor', 'admin'],
  }),
  raiseAlert: permission('work.alert.raise', {
    description:
      "Raise an automatic alert (e.g. R15 device offline) as an internal action owned by the project's PM (system only)",
    roles: ['system'],
  }),
  resolveAlert: permission('work.alert.resolve', {
    description: 'Withdraw the open actions of alerts that cleared, e.g. a device back online (system only)',
    roles: ['system'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
