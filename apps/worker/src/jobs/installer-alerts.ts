// Installer alerts job — domain/rules.md, hourly; raises internal actions for the project's PM (D-38 due dates) and
// withdraws them once the gap is gone. Idempotent through the alert ref.
// R29 (P1, D-44): a confirmed installer quote, per sensor, > 20 % above the average of comparable quotes (same country
// and scope) while the job is being quoted; withdrawn once the quote is archived or no longer above, or approved.
// R12 (P0): an open installer job counts other sensors than the store's current design (active proposal, D-43; CBox
// not counted, D-42); withdrawn once they match again or the job is closed.
import { designChecks, quoteChecks } from '@ocs/core/installers';
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { raiseAlert, resolveAlert } from '@ocs/core/work';

export const quoteRef = (siteId: string) => `R29:${siteId}`;
export const designRef = (siteId: string) => `R12:${siteId}`;

/** +33 %, −5 %, or n/a. */
const signed = (p: number | null) => (p === null ? 'n/a' : `${p > 0 ? '+' : ''}${String(p)} %`);

export async function runInstallerAlertsJob(kernel: Pick<Kernel, 'execute' | 'read'>) {
  const actor = systemActor('installer-alerts');
  const sites = await kernel.read(quoteChecks, actor, {});
  const design = await kernel.read(designChecks, actor, {});
  const raise: { siteId: string; ref: string; title: string; level: 'P0' | 'P1' }[] = [];
  const clear: string[] = [];
  const clearDesign: string[] = [];
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
  for (const d of design) {
    if (d.r12)
      raise.push({
        siteId: d.siteId,
        ref: designRef(d.siteId),
        level: 'P0',
        title: `${d.projectId}: installer job counts ${String(d.jobSensors)} sensors but the store design has ${String(d.designSensors)} — correct the job or the design (R12)`,
      });
    else clearDesign.push(designRef(d.siteId));
  }
  const raised =
    raise.length > 0 ? await kernel.execute(raiseAlert, actor, { alerts: raise }, 'system') : null;
  const resolve = async (refs: string[], reason: string) =>
    refs.length > 0
      ? (await kernel.execute(resolveAlert, actor, { refs, reason }, 'system')).withdrawn.length
      : 0;
  const withdrawn =
    (await resolve(clear, 'Quote no longer above the average, archived or approved')) +
    (await resolve(clearDesign, 'Job sensors match the store design, or the job is closed'));
  return { raised: raised?.created.length ?? 0, withdrawn };
}
