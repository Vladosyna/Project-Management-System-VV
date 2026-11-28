// The sensors of each store's current design: its active proposal (D-43), counted as in the time standard (D-42: CBox
// not counted). For R12 in installers, which compares them with the installer job (read through this public API).
import { proposalsOfSites } from '../repository.ts';
import { sensorsOf, type Devices } from '../rules/quotation.ts';

/** Stores without an active proposal are left out. */
export async function designSensors(
  tx: Parameters<typeof proposalsOfSites>[0],
  siteIds: readonly string[],
): Promise<Map<string, number>> {
  if (siteIds.length === 0) return new Map();
  const proposals = await proposalsOfSites(tx, siteIds);
  return new Map(proposals.map((p) => [p.siteId, sensorsOf(p.items as Devices[])]));
}
