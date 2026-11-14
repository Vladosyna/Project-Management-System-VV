// lifecycle permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const lifecyclePermissions = {
  recordStep: permission('lifecycle.step.record', {
    description: 'Record a step reached on a project — base step or gate — with date and evidence (E3 AC1)',
    roles: ['director', 'pm', 'sales'],
  }),
  planInstallation: permission('lifecycle.installation.plan', {
    description: 'Set the planned installation date, only once the site card is complete (SOP-DEL-04 §1)',
    roles: ['director', 'pm'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
