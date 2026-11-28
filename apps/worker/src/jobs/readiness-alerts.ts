// Readiness alerts job — hourly; raises internal actions for the project's PM and withdraws them once the gap is gone.
// Idempotent through the alert ref.
// R9 (P0), SOP-DEL-04 steps 6–7: installation within the readiness window and readiness not confirmed; withdrawn once
// readiness is confirmed, the date moves out of the window or the project is installed.
// R32 (P1, D-47): readiness not confirmed 20 working days before the planned installation; withdrawn once readiness is
// confirmed, the date is removed or moves beyond D−20, or the project is installed. Not a block on booking.
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { readinessGaps } from '@ocs/core/lifecycle';
import { raiseAlert, resolveAlert } from '@ocs/core/work';

export const readinessRef = (siteId: string) => `R9:${siteId}`;
export const readinessD20Ref = (siteId: string) => `R32:${siteId}`;

export async function runReadinessAlertsJob(kernel: Pick<Kernel, 'execute' | 'read'>) {
  const actor = systemActor('readiness-alerts');
  const sites = await kernel.read(readinessGaps, actor, {});
  const raise: { siteId: string; ref: string; title: string; level: 'P0' | 'P1' }[] = [];
  const clear: string[] = [];
  const clearD20: string[] = [];
  for (const s of sites) {
    if (s.r9)
      raise.push({
        siteId: s.siteId,
        ref: readinessRef(s.siteId),
        // domain/rules.md R9 is P0; the due date follows from the level (shared alert command).
        level: 'P0',
        title: `${s.projectId}: installation ${String(s.plannedInstallationDate)}, readiness not confirmed — confirm it or move the date (R9)`,
      });
    else clear.push(readinessRef(s.siteId));
    if (s.r32)
      raise.push({
        siteId: s.siteId,
        ref: readinessD20Ref(s.siteId),
        level: 'P1',
        title: `${s.projectId}: installation ${String(s.plannedInstallationDate)} is 20 working days away or less and readiness is not confirmed — get the market to confirm it (R32)`,
      });
    else clearD20.push(readinessD20Ref(s.siteId));
  }
  const raised =
    raise.length > 0 ? await kernel.execute(raiseAlert, actor, { alerts: raise }, 'system') : null;
  const resolve = async (refs: string[], reason: string) =>
    refs.length > 0
      ? (await kernel.execute(resolveAlert, actor, { refs, reason }, 'system')).withdrawn.length
      : 0;
  const withdrawn =
    (await resolve(clear, 'Readiness confirmed or not due')) +
    (await resolve(clearD20, 'Readiness confirmed, date removed or not yet D−20'));
  return { raised: raised?.created.length ?? 0, withdrawn };
}
