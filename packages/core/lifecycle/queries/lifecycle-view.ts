// One project's life cycle as people read it (E3): the stage (last base step reached), its gates passed / current /
// not started, working days to installation and R9 readiness. Shared by the Lifecycle tab (siteLifecycle) and the
// programme tracker (E11 AC3) so both always say the same.
import { installationPlanRule } from '../rules/installation-plan.config.ts';
import { readinessAtRisk } from '../rules/readiness.ts';
import { workingDaysToInstallation } from './installation-countdown.ts';

interface Gate {
  readonly key: string;
  readonly name: string;
  readonly order: number;
  readonly readinessDays?: number | undefined;
}

export function lifecycleView(input: {
  readonly steps: readonly { readonly step: string; readonly doneOn: string }[];
  readonly gates: readonly Gate[];
  readonly plannedInstallationDate: string | null;
  readonly countryCode: string;
  readonly now: Date;
}) {
  const reached = input.steps.map((s) => s.step);
  const gates = [...input.gates].sort((a, b) => a.order - b.order);
  const firstOpen = gates.find((g) => !reached.includes(g.key))?.key;
  const daysTo = workingDaysToInstallation(input.plannedInstallationDate, input.now, input.countryCode);
  const templateDays = gates.find((g) => g.readinessDays !== undefined)?.readinessDays;
  return {
    stage: [...installationPlanRule.baseSteps].reverse().find((s) => reached.includes(s)) ?? null,
    gates: gates.map((g) => ({
      key: g.key,
      name: g.name,
      status: reached.includes(g.key)
        ? ('passed' as const)
        : g.key === firstOpen
          ? ('current' as const)
          : ('not_started' as const),
      doneOn: input.steps.find((s) => s.step === g.key)?.doneOn ?? null,
    })),
    plannedInstallationDate: input.plannedInstallationDate,
    workingDaysToInstallation: daysTo,
    readinessAtRisk: readinessAtRisk({ workingDaysToInstallation: daysTo, reached, templateDays }),
  };
}
