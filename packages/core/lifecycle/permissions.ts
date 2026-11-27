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
  siteLifecycle: permission('lifecycle.siteLifecycle.read', {
    description: "See a project's steps, gates, installation plan and readiness (E3)",
    roles: ['director', 'pm', 'sales', 'rnd', 'finance', 'management', 'sponsor', 'admin'],
  }),
  saveGateTemplate: permission('lifecycle.gateTemplate.save', {
    description: 'Create or replace the gate template of a scope: base, client, programme, country (D-32)',
    roles: ['director', 'sponsor'],
  }),
  archiveGateTemplate: permission('lifecycle.gateTemplate.archive', {
    description: 'Archive a gate template; its projects fall back to the next scope (D-32)',
    roles: ['director', 'sponsor'],
  }),
  gateTemplates: permission('lifecycle.gateTemplates.read', {
    description: 'See the gate templates and their scopes (D-32)',
    roles: ['director', 'sponsor', 'pm', 'management'],
  }),
  readinessGaps: permission('lifecycle.readinessGaps.read', {
    description:
      'For the hourly alert run: every active project, flagged when installation is within the readiness window and readiness is not confirmed (R9).',
    roles: ['system'],
  }),
  programmeTracker: permission('lifecycle.programmeTracker.read', {
    description:
      'The programme tracker (E11 AC3): every project with stage, planned installation, readiness and gates, by client, programme or country',
    roles: ['director', 'pm', 'sales', 'rnd', 'finance', 'management', 'sponsor', 'admin'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
