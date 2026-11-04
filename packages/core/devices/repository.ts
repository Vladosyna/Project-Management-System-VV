// devices repository — the only place in this module that touches tables.
import { and, device, eq, inArray, isNull, site, sql, zone, type Tx } from '@ocs/db';

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

/** A project with its mall on the device platform (07-integrations: site = mall). */
export async function findPlatformSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId, platformRef: site.platformRef })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

export async function activeZonesOf(tx: Tx, siteId: string) {
  return tx
    .select({
      id: zone.id,
      platformRef: zone.platformRef,
      kind: zone.kind,
      name: zone.name,
      entrance: zone.entrance,
    })
    .from(zone)
    .where(and(eq(zone.siteId, siteId), isNull(zone.archivedAt)));
}

export async function insertZones(tx: Tx, rows: (typeof zone.$inferInsert)[]): Promise<void> {
  if (rows.length > 0) await tx.insert(zone).values(rows);
}

export async function updateZone(
  tx: Tx,
  id: string,
  values: Pick<typeof zone.$inferInsert, 'kind' | 'name' | 'entrance'>,
): Promise<void> {
  await tx.update(zone).set(values).where(eq(zone.id, id));
}

/** Archive, never delete (SOP-DEL-02). */
export async function archiveZones(tx: Tx, ids: string[], at: Date): Promise<void> {
  if (ids.length > 0) await tx.update(zone).set({ archivedAt: at }).where(inArray(zone.id, ids));
}
