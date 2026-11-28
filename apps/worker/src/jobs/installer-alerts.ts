// Installer alerts job — domain/rules.md R29 (P1, D-38 due date; D-44): a confirmed installer quote, per sensor, > 20 %
// above the average of comparable quotes (same country and scope) while the job is being quoted. Hourly: raises an internal
// action for the project's PM and withdraws it once the quote is archived or no longer above, or the CEO approval is
// recorded. Idempotent through the alert ref.
import { quoteChecks } from '@ocs/core/installers';
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { raiseAlert, resolveAlert } from '@ocs/core/work';

export const quoteRef = (siteId: string) => `R29:${siteId}`;

/** +33 %, −5 %, or n/a. */
const signed = (p: number | null) => (p === null ? 'n/a' : `${p > 0 ? '+' : ''}${String(p)} %`);

export async function runInstallerAlertsJob(kernel: Pick<Kernel, 'execute' | 'read'>) {
  const actor = systemActor('installer-alerts');
  const sites = await kernel.read(quoteChecks, actor, {});
  const raise: { siteId: string; ref: string; title: string; level: 'P1' }[] = [];
  const clear: string[] = [];
  for (const s of sites) {
    if (s.r29)
      raise.push({
        siteId: s.siteId,
        ref: quoteRef(s.siteId),
        level: 'P1',
        title: `${s.projectId}: installer quote per sensor is above the average of comparable quotes (labour ${signed(s.labourPercent)}, total ${signed(s.totalPercent)}) — check it before approval (R29)`,
      });
    else clear.push(quoteRef(s.siteId));
  }
  const raised =
    raise.length > 0 ? await kernel.execute(raiseAlert, actor, { alerts: raise }, 'system') : null;
  const cleared =
    clear.length > 0
      ? await kernel.execute(
          resolveAlert,
          actor,
          { refs: clear, reason: 'Quote no longer above the average, archived or approved' },
          'system',
        )
      : null;
  return { raised: raised?.created.length ?? 0, withdrawn: cleared?.withdrawn.length ?? 0 };
}
