// devices repository — the only place in this module that touches tables.
import { and, device, eq, isNull, site, sql, type Tx } from '@ocs/db';

/** The device life cycle, re-exported so commands validate against the schema's own list. */
export { DEVICE_STATUSES } from '@ocs/db';

/** The project a device is registered on: active, visible to the actor (RLS). Read only — sites belong to org. */
export async function findActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId, projectId: site.projectId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

/** Active devices with this SN (any case), with the Project ID they sit on (R6). */
export async function activeDevicesWithSn(tx: Tx, sn: string) {
  return tx
    .select({ sn: device.sn, projectId: site.projectId })
    .from(device)
    .innerJoin(site, eq(site.id, device.siteId))
    .where(and(isNull(device.archivedAt), sql`upper(${device.sn}) = upper(${sn})`));
}

export async function insertDevice(tx: Tx, row: typeof device.$inferInsert): Promise<void> {
  await tx.insert(device).values(row);
}
