// devices repository — the only place in this module that touches tables.
import { and, device, eq, isNull, or, site, sql, type Tx } from '@ocs/db';

/** The project a device is registered on: active, visible to the actor (RLS). Read only — sites belong to org. */
export async function findActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId, projectId: site.projectId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

/** Active devices with this SN (any case) or this MAC, with the Project ID they sit on (R6). */
export async function activeDevicesWith(tx: Tx, sn: string, mac: string | null) {
  return tx
    .select({ sn: device.sn, mac: device.mac, projectId: site.projectId })
    .from(device)
    .innerJoin(site, eq(site.id, device.siteId))
    .where(
      and(
        isNull(device.archivedAt),
        mac === null
          ? sql`upper(${device.sn}) = upper(${sn})`
          : or(sql`upper(${device.sn}) = upper(${sn})`, eq(device.mac, mac)),
      ),
    );
}

export async function insertDevice(tx: Tx, row: typeof device.$inferInsert): Promise<void> {
  await tx.insert(device).values(row);
}
