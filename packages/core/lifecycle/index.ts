// lifecycle — Project life cycle: steps, installation plan, gates (SOP-DEL-04, E3)
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { lifecyclePermissions } from './permissions.ts';
export { recordStep } from './commands/record-step.ts';
export { planInstallation } from './commands/plan-installation.ts';
