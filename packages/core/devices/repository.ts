// devices repository — the only place in this module that touches tables.
import { and, device, eq, inArray, isNotNull, isNull, site, sql, zone, type Tx } from '@ocs/db';

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
    .select({
      id: device.id,
      siteId: device.siteId,
      sn: device.sn,
      registeredAt: device.registeredAt,
      projectId: site.projectId,
    })
    .from(device)
    .innerJoin(site, eq(site.id, device.siteId))
    .where(and(isNull(device.archivedAt), sql`upper(${device.sn}) = upper(${sn})`));
}

export async function insertDevice(tx: Tx, row: typeof device.$inferInsert): Promise<void> {
  await tx.insert(device).values(row);
}

export { DEVICE_PLATFORM_STATUSES } from '@ocs/db';

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

/** Active devices, on any project, whose SN (any case) is one of these — with the Project ID they sit on. */
export async function activeDevicesBySn(tx: Tx, sns: string[]) {
  if (sns.length === 0) return [];
  const upper = sns.map((sn) => sn.toUpperCase());
  return tx
    .select({
      id: device.id,
      siteId: device.siteId,
      sn: device.sn,
      mac: device.mac,
      ip: device.ip,
      platformStatus: device.platformStatus,
      offlineSince: device.offlineSince,
      registeredAt: device.registeredAt,
      projectId: site.projectId,
    })
    .from(device)
    .innerJoin(site, eq(site.id, device.siteId))
    .where(and(isNull(device.archivedAt), inArray(sql`upper(${device.sn})`, upper)));
}

export async function updateDeviceFromPlatform(
  tx: Tx,
  id: string,
  values: Pick<typeof device.$inferInsert, 'mac' | 'ip' | 'platformStatus' | 'offlineSince' | 'syncedAt'>,
): Promise<void> {
  await tx.update(device).set(values).where(eq(device.id, id));
}

export async function insertDevices(tx: Tx, rows: (typeof device.$inferInsert)[]): Promise<void> {
  if (rows.length > 0) await tx.insert(device).values(rows);
}

/** Active devices offline since before `cutoff` on active projects, with the project's PM and alerts switch (R15). */
export async function offlineDevicesSince(tx: Tx, cutoff: Date) {
  return tx
    .select({
      deviceId: device.id,
      sn: device.sn,
      platformStatus: device.platformStatus,
      offlineSince: device.offlineSince,
      siteId: site.id,
      clientId: site.clientId,
      projectId: site.projectId,
      pmId: site.pmId,
      alertsEnabled: site.deviceAlertsEnabled,
    })
    .from(device)
    .innerJoin(site, eq(site.id, device.siteId))
    .where(
      and(
        isNull(device.archivedAt),
        isNull(site.archivedAt),
        eq(device.platformStatus, 'offline'),
        sql`${device.offlineSince} < ${cutoff}`,
      ),
    )
    .orderBy(device.offlineSince);
}

/** Reconciliation: active devices registered in OCS on this project whose SN the platform did not list. */
export async function registeredNotListed(tx: Tx, siteId: string, sns: string[]) {
  const upper = sns.map((sn) => sn.toUpperCase());
  const rows = await tx
    .select({ sn: device.sn })
    .from(device)
    .where(
      and(
        eq(device.siteId, siteId),
        isNull(device.archivedAt),
        isNotNull(device.registeredAt),
        upper.length > 0
          ? sql`upper(${device.sn}) NOT IN (${sql.join(
              upper.map((u) => sql`${u}`),
              sql`, `,
            )})`
          : undefined,
      ),
    )
    .orderBy(device.sn);
  return rows.map((r) => r.sn);
}

/** A device the platform brought in, now registered in OCS by SN: the registration confirms it. */
export async function confirmDevice(
  tx: Tx,
  id: string,
  values: Partial<typeof device.$inferInsert> & { registeredAt: Date },
): Promise<void> {
  await tx.update(device).set(values).where(eq(device.id, id));
}
