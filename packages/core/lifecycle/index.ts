// lifecycle — Project life cycle: steps, installation plan, gates (SOP-DEL-04, E3)
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { lifecyclePermissions } from './permissions.ts';
export { recordStep } from './commands/record-step.ts';
export { planInstallation } from './commands/plan-installation.ts';
export { siteLifecycle } from './queries/site-lifecycle.ts';
export { saveGateTemplate } from './commands/save-gate-template.ts';
export { archiveGateTemplate } from './commands/archive-gate-template.ts';
export { gateTemplates } from './queries/gate-templates.ts';
export { readinessGaps } from './queries/readiness-gaps.ts';
export { programmeTracker } from './queries/programme-tracker.ts';
export { weeklyReport } from './queries/weekly-report.ts';
