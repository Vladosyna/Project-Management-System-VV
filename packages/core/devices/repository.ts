// devices repository — the only place in this module that touches tables.
import { and, device, eq, inArray, isNull, site, sql, type Tx } from '@ocs/db';

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
