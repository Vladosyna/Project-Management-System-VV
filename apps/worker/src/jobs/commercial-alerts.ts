// Commercial alerts job — domain/rules.md R14 (installed without PO), R24 (installed without DPIA), R26 (site without
// owner), D-34 N2. Hourly: raises an internal action per gap (owner: the project's PM; R26: each Delivery Director)
// and withdraws the action once the gap is closed. Idempotent through the alert ref. R25 and R27 follow with E12.
import { gaps } from '@ocs/core/commercial';
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { raiseAlert, resolveAlert } from '@ocs/core/work';

export const gapRef = (rule: 'R14' | 'R24' | 'R26', siteId: string, ownerId?: string) =>
  ownerId ? `${rule}:${siteId}:${ownerId}` : `${rule}:${siteId}`;

const TITLE = {
  R14: 'installed without a client PO — record the PO (R14)',
  R24: 'installed without an approved DPIA — calibration stays blocked (R24)',
  R26: 'project without an owner — assign a PM (R26)',
} as const;

export async function runCommercialAlertsJob(kernel: Pick<Kernel, 'execute' | 'read'>) {
  const actor = systemActor('commercial-alerts');
  const { sites, directors } = await kernel.read(gaps, actor, {});
  const raise: { siteId: string; ref: string; title: string; ownerId?: string }[] = [];
  const clear: string[] = [];
  for (const s of sites) {
    for (const rule of ['R14', 'R24'] as const) {
      const ref = gapRef(rule, s.siteId);
      if (s[rule === 'R14' ? 'r14' : 'r24'])
        raise.push({ siteId: s.siteId, ref, title: `${s.projectId}: ${TITLE[rule]}` });
      else clear.push(ref);
    }
    for (const d of directors) {
      const ref = gapRef('R26', s.siteId, d);
      if (s.r26) raise.push({ siteId: s.siteId, ref, title: `${s.projectId}: ${TITLE.R26}`, ownerId: d });
      else clear.push(ref);
    }
  }
  const raised =
    raise.length > 0 ? await kernel.execute(raiseAlert, actor, { alerts: raise }, 'system') : null;
  const cleared =
    clear.length > 0
      ? await kernel.execute(resolveAlert, actor, { refs: clear, reason: 'Commercial gap closed' }, 'system')
      : null;
  return { raised: raised?.created.length ?? 0, withdrawn: cleared?.withdrawn.length ?? 0 };
}
