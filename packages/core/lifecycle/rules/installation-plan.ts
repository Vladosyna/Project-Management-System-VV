// SOP-DEL-04 §1, E3 AC1/AC4 — evaluators. Read only ./installation-plan.config.ts; refuse with RuleViolation.
import { RuleViolation } from '../../kernel/index.ts';
import { installationPlanRule as rule } from './installation-plan.config.ts';

export type BaseStep = (typeof rule.baseSteps)[number];
export const isBaseStep = (step: string): step is BaseStep =>
  (rule.baseSteps as readonly string[]).includes(step);

/** An installation date only once the site card is complete. */
export function checkInstallationPlan(input: { reached: readonly string[] }): void {
  if (!input.reached.includes(rule.requiredStep)) {
    throw new RuleViolation(rule.cite, 'No completed Site Information Card, no installation date');
  }
}

/** A base step needs the one before it; "accepted" needs its evidence named by the site's standard. */
export function checkStep(input: {
  step: string;
  reached: readonly string[];
  standard: 'L' | 'S';
  evidence: string | null;
}): void {
  if (!isBaseStep(input.step)) return;
  const i = rule.baseSteps.indexOf(input.step);
  const before = i > 0 ? rule.baseSteps[i - 1] : undefined;
  if (before !== undefined && !input.reached.includes(before)) {
    throw new RuleViolation('E3 AC1', `"${input.step}" needs "${before}" first`);
  }
  if (input.step === 'accepted' && input.evidence === null) {
    throw new RuleViolation('E3 AC4', `acceptance needs the ${rule.acceptanceEvidence[input.standard]}`);
  }
}
