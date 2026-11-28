// Commercial alerts job — domain/rules.md R14 (installed without PO), R24 (installed without DPIA), R26 (site without
// owner), D-34 N2; R5 (accepted, no client invoice after 5 working days); R27 (approved installer cost above the
// client price, P-03); R13 (overlapping open client POs); R40 (confirmed PO, no country LPA,
// D-45). Hourly: raises an internal action per gap
// (owner: the project's PM; R26: each Delivery Director) and withdraws the action once the gap is closed. Idempotent
// through the alert ref. R25 follows with the supplier invoice (E12 AC7).
import { gaps } from '@ocs/core/commercial';
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { raiseAlert, resolveAlert } from '@ocs/core/work';

export const gapRef = (
  rule: 'R5' | 'R13' | 'R14' | 'R24' | 'R26' | 'R27' | 'R40',
  siteId: string,
  ownerId?: string,
) => (ownerId ? `${rule}:${siteId}:${ownerId}` : `${rule}:${siteId}`);

const TITLE = {
  R5: 'accepted 5 working days ago without a client invoice — record the invoice (R5)',
  R13: 'in more than one open client PO — keep one, archive the others (R13)',
  R14: 'installed without a client PO — record the PO (R14)',
  R24: 'installed without an approved DPIA — calibration stays blocked (R24)',
  R26: 'project without an owner — assign a PM (R26)',
  R27: 'approved installer cost is above the client price — review the margin (R27)',
  R40: "client PO recorded, but no approved LPA for the store's country — record the LPA (R40)",
} as const;

/** domain/rules.md levels; the due date follows from the level (D-38). */
const LEVEL = { R5: 'P1', R13: 'P0', R14: 'P0', R24: 'P0', R27: 'P0', R40: 'P1' } as const;
const FLAG = { R5: 'r5', R13: 'r13', R14: 'r14', R24: 'r24', R27: 'r27', R40: 'r40' } as const;

export async function runCommercialAlertsJob(kernel: Pick<Kernel, 'execute' | 'read'>) {
  const actor = systemActor('commercial-alerts');
  const { sites, directors } = await kernel.read(gaps, actor, {});
  const raise: { siteId: string; ref: string; title: string; level: 'P0' | 'P1'; ownerId?: string }[] = [];
  const clear: string[] = [];
  for (const s of sites) {
    for (const rule of ['R14', 'R24', 'R5', 'R27', 'R13', 'R40'] as const) {
      const ref = gapRef(rule, s.siteId);
      if (s[FLAG[rule]])
        raise.push({ siteId: s.siteId, ref, title: `${s.projectId}: ${TITLE[rule]}`, level: LEVEL[rule] });
      else clear.push(ref);
    }
    for (const d of directors) {
      const ref = gapRef('R26', s.siteId, d);
      if (s.r26)
        raise.push({ siteId: s.siteId, ref, title: `${s.projectId}: ${TITLE.R26}`, level: 'P1', ownerId: d });
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
