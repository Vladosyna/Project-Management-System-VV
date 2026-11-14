// devices repository — the only place in this module that touches tables.
import {
  and,
  device,
  deviceChannel,
  eq,
  inArray,
  isNotNull,
  isNull,
  site,
  sql,
  zone,
  type Tx,
} from '@ocs/db';

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

/** Active projects linked to a mall on the device platform (07-integrations: site = mall). */
export async function platformLinkedSites(tx: Tx) {
  return tx
    .select({
      siteId: site.id,
      projectId: site.projectId,
      platformRef: site.platformRef,
      alertsEnabled: site.deviceAlertsEnabled,
    })
    .from(site)
    .where(and(isNull(site.archivedAt), isNotNull(site.platformRef)))
    .orderBy(site.projectId);
}

/** Active gates of a project by platform ref (channel binding). */
export async function activeGatesOf(tx: Tx, siteId: string): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: zone.id, ref: zone.platformRef })
    .from(zone)
    .where(and(eq(zone.siteId, siteId), eq(zone.kind, 'gate'), isNull(zone.archivedAt)));
  return new Map(rows.map((r) => [r.ref, r.id]));
}

/** Insert or re-bind channels in place (never deleted). */
export async function upsertChannels(tx: Tx, rows: (typeof deviceChannel.$inferInsert)[]): Promise<void> {
  if (rows.length === 0) return;
  await tx
    .insert(deviceChannel)
    .values(rows)
    .onConflictDoUpdate({
      target: [deviceChannel.deviceId, deviceChannel.channelNo],
      set: { zoneId: sql`excluded.zone_id` },
    });
}

/** Channels of these devices that the platform no longer lists keep their row, unbound. */
export async function unbindChannelsNotIn(
  tx: Tx,
  devices: { deviceId: string; nos: number[] }[],
): Promise<void> {
  for (const d of devices) {
    await tx
      .update(deviceChannel)
      .set({ zoneId: null })
      .where(
        and(
          eq(deviceChannel.deviceId, d.deviceId),
          isNotNull(deviceChannel.zoneId),
          d.nos.length > 0
            ? sql`${deviceChannel.channelNo} NOT IN (${sql.join(
                d.nos.map((n) => sql`${n}`),
                sql`, `,
              )})`
            : undefined,
        ),
      );
  }
}

/** A project's active devices with the gate each channel counts (site page, Devices tab). */
export async function siteDevicesWithGates(tx: Tx, siteId: string) {
  const devices = await tx
    .select({
      id: device.id,
      sn: device.sn,
      model: device.model,
      mac: device.mac,
      ip: device.ip,
      switchName: device.switchName,
      switchPort: device.switchPort,
      status: device.status,
      platformStatus: device.platformStatus,
      offlineSince: device.offlineSince,
      syncedAt: device.syncedAt,
      registeredAt: device.registeredAt,
    })
    .from(device)
    .where(and(eq(device.siteId, siteId), isNull(device.archivedAt)))
    .orderBy(device.sn);
  const channels = await tx
    .select({ deviceId: deviceChannel.deviceId, channelNo: deviceChannel.channelNo, gate: zone.name })
    .from(deviceChannel)
    .leftJoin(zone, eq(zone.id, deviceChannel.zoneId))
    .where(eq(deviceChannel.siteId, siteId))
    .orderBy(deviceChannel.channelNo);
  return { devices, channels };
}
