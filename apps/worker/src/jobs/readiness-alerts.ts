// Readiness alerts job — domain/rules.md R9 (P0), SOP-DEL-04 steps 6–7: installation within the readiness window and
// readiness not confirmed. Hourly: raises an internal action for the project's PM and withdraws it once readiness is
// confirmed, the date moves out of the window or the project is installed. Idempotent through the alert ref.
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { readinessGaps } from '@ocs/core/lifecycle';
import { raiseAlert, resolveAlert } from '@ocs/core/work';

export const readinessRef = (siteId: string) => `R9:${siteId}`;

export async function runReadinessAlertsJob(kernel: Pick<Kernel, 'execute' | 'read'>) {
  const actor = systemActor('readiness-alerts');
  const sites = await kernel.read(readinessGaps, actor, {});
  const raise: { siteId: string; ref: string; title: string }[] = [];
  const clear: string[] = [];
  for (const s of sites) {
    if (s.r9)
      raise.push({
        siteId: s.siteId,
        ref: readinessRef(s.siteId),
        title: `${s.projectId}: installation ${String(s.plannedInstallationDate)}, readiness not confirmed — confirm it or move the date (R9)`,
      });
    else clear.push(readinessRef(s.siteId));
  }
  const raised =
    raise.length > 0 ? await kernel.execute(raiseAlert, actor, { alerts: raise }, 'system') : null;
  const cleared =
    clear.length > 0
      ? await kernel.execute(
          resolveAlert,
          actor,
          { refs: clear, reason: 'Readiness confirmed or not due' },
          'system',
        )
      : null;
  return { raised: raised?.created.length ?? 0, withdrawn: cleared?.withdrawn.length ?? 0 };
}
