// Installer alerts job — domain/rules.md R29 (P1; P-12, D-34 N1): a confirmed installer quote above the time standard
// while the job is being quoted. Hourly: raises an internal action for the project's PM and withdraws it once the
// quote is archived, replaced by a compliant one or the CEO approval is recorded. Idempotent through the alert ref.
import { quoteChecks } from '@ocs/core/installers';
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { raiseAlert, resolveAlert } from '@ocs/core/work';

export const quoteRef = (siteId: string) => `R29:${siteId}`;

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
        // domain/rules.md R29 is P1; the due date follows from the level (D-38).
        level: 'P1',
        title: `${s.projectId}: installer quote has ${String(s.quotedHours)} h against the time standard of ${String(s.standardHours)} h — ask for the reason or a new quote (R29)`,
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
          { refs: clear, reason: 'Quote within the time standard or decided' },
          'system',
        )
      : null;
  return { raised: raised?.created.length ?? 0, withdrawn: cleared?.withdrawn.length ?? 0 };
}
