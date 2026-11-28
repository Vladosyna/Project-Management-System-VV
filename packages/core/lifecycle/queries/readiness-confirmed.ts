// Whether a project's readiness is confirmed: its base step "readiness_confirmed" (readinessRule.clearedBy) is
// recorded and active. Lifecycle owns what readiness means; installers ask through this (R32, D-34 C3).
import { activeSteps } from '../repository.ts';
import { readinessRule } from '../rules/readiness.config.ts';

export async function readinessConfirmed(
  tx: Parameters<typeof activeSteps>[0],
  siteId: string,
): Promise<boolean> {
  return (await activeSteps(tx, siteId)).some((s) => s.step === readinessRule.clearedBy);
}
