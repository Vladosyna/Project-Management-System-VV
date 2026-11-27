// Intake conditions job — E2 AC3, SOP-DEL-01 §8: conditions of acceptance past their deadline expire, and each
// expiry becomes an internal action for the project's Sales owner and for the Delivery Director. Idempotent: the
// command expires a condition once, and one action per condition and owner (the alert ref) is raised.
import { expireConditions } from '@ocs/core/intake';
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { raiseAlert } from '@ocs/core/work';

export const conditionRef = (conditionId: string, ownerId: string) => `COND:${conditionId}:${ownerId}`;

export async function runIntakeConditionsJob(kernel: Pick<Kernel, 'execute'>) {
  const actor = systemActor('intake-conditions');
  const { expired } = await kernel.execute(expireConditions, actor, {}, 'system');
  const alerts = expired.flatMap((c) =>
    c.notify.map((ownerId) => ({
      siteId: c.siteId,
      ref: conditionRef(c.conditionId, ownerId),
      ownerId,
      // domain/rules.md intake: condition expiry → P1.
      level: 'P1' as const,
      title: `${c.projectId}: intake condition ${c.itemCode} expired on ${c.deadline} — follow up (SOP-DEL-01 §8)`,
    })),
  );
  const raised = alerts.length > 0 ? await kernel.execute(raiseAlert, actor, { alerts }, 'system') : null;
  return { expired: expired.length, raised: raised?.created.length ?? 0 };
}
