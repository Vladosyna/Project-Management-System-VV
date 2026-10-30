// Generators for OCS structure (F0.10). CLI: src/cli.ts (pnpm gen:*), proof: src/selftest.ts (pnpm gen:selftest).
export { commandPlan, modulePlan, queryPlan, rulePlan } from './core.ts';
export { migrationPlan, nextMigrationNumber } from './db.ts';
export { applyPlan } from './plan.ts';
export type { Change, Plan } from './plan.ts';
