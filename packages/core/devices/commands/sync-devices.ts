// devices.platform.syncDevices — E4, D-29: one project's devices as the device platform reports them. The
// worker reads the platform (apps/worker adapters/device-platform) and runs this as the system actor; the
// adapter never writes tables (ocs-integration §3). Idempotent: the same snapshot twice changes nothing more.
// - Devices match on SN in any case (D-29): MAC, IP and platform status are refreshed; offline_since is set
//   when a device is first seen offline, with a went_offline event (R15 reads it). Devices whose offline
//   episode ended are listed in the result, so the alert job can withdraw their R15 action.
// - A new SN is added as installed. An SN active on another project is reported, not moved.
// - Devices on the project that the platform does not list are left as they are (manual or imported ones).
import { z } from 'zod';
import { Conflict, defineCommand, NotFound } from '../../kernel/index.ts';
import { normaliseMac } from '../mac.ts';
import { devicesPermissions } from '../permissions.ts';
import {
  activeDevicesBySn,
  activeGatesOf,
  DEVICE_PLATFORM_STATUSES,
  findPlatformSite,
  insertDevices,
  registeredNotListed,
  unbindChannelsNotIn,
  upsertChannels,
  updateDeviceFromPlatform,
} from '../repository.ts';
import { offlineChange } from '../sync/offline.ts';

const text = (max: number) => z.string().trim().min(1).max(max);
/** A MAC the platform sends in a spelling OCS does not know is dropped, not a reason to fail the sync. */
const macOf = (raw: string | undefined) => (raw === undefined ? null : (normaliseMac(raw) ?? null));

export const syncDevices = defineCommand({
  name: 'devices.platform.syncDevices',
  permission: devicesPermissions.syncDevices,
  input: z.object({
    siteId: z.uuid(),
    devices: z
      .array(
        z.object({
          sn: text(100),
          model: text(50),
          mac: z.string().trim().max(30).optional(),
          ip: z.union([z.ipv4(), z.ipv6()]).optional(),
          status: z.enum(DEVICE_PLATFORM_STATUSES),
          /** Which gate each channel counts (platform gateUnid); null while unbound. */
          channels: z
            .array(
              z.object({ no: z.int().min(1).max(64), gateRef: z.string().trim().min(1).max(100).nullable() }),
            )
            .max(64)
            .default([]),
        }),
      )
      .max(5000)
      .refine((ds) => new Set(ds.map((d) => d.sn.toUpperCase())).size === ds.length, 'an SN appears twice'),
  }),
  describe: (i) => `Sync ${String(i.devices.length)} devices from the platform`,
  handle: async (ctx, i) => {
    const project = await findPlatformSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    if (project.platformRef === null)
      throw new Conflict('this project is not linked to a mall on the platform');

    /** `since`: when it went offline (for offline_ended, since when it was down). */
    const event = (
      type: 'went_offline' | 'offline_ended',
      deviceId: string,
      sn: string,
      since: Date | null,
    ) => {
      const payload = { deviceId, siteId: project.id, sn, since: since?.toISOString() ?? null };
      ctx.emit(`devices.device.${type}`, payload, project.clientId);
    };
    const known = await activeDevicesBySn(
      ctx.tx,
      i.devices.map((d) => d.sn),
    );
    const bySn = new Map(known.map((d) => [d.sn.toUpperCase(), d]));
    const elsewhere: { sn: string; projectId: string }[] = [];
    /** Back online or disabled: the alert job withdraws the R15 action of that episode (Vlad, 4 Nov). */
    const offlineEnded: { deviceId: string; sn: string; offlineSince: string }[] = [];
    /** Reconciliation (Vlad, 4 Nov): on the platform here, but nobody registered the SN in OCS. */
    const notRegistered: string[] = [];
    let updated = 0;
    const rows = [];
    const channelsOf: { deviceId: string; channels: { no: number; gateRef: string | null }[] }[] = [];
    for (const d of i.devices) {
      const mac = macOf(d.mac);
      const ip = d.ip ?? null;
      const was = bySn.get(d.sn.toUpperCase());
      if (was && was.siteId !== project.id) {
        elsewhere.push({ sn: d.sn, projectId: was.projectId });
        continue;
      }
      const change = offlineChange(
        ctx.now,
        d.status,
        was ? { status: was.platformStatus, offlineSince: was.offlineSince } : null,
      );
      const id = was?.id ?? ctx.newId();
      channelsOf.push({ deviceId: id, channels: d.channels });
      if (!was?.registeredAt) notRegistered.push(d.sn);
      if (was) {
        const same =
          was.mac === mac &&
          was.ip === ip &&
          was.platformStatus === d.status &&
          was.offlineSince?.getTime() === change.offlineSince?.getTime();
        if (!same) updated += 1;
        await updateDeviceFromPlatform(ctx.tx, id, {
          mac,
          ip,
          platformStatus: d.status,
          offlineSince: change.offlineSince,
          syncedAt: ctx.now,
        });
      } else {
        rows.push({
          id,
          clientId: project.clientId,
          siteId: project.id,
          sn: d.sn,
          mac,
          model: d.model,
          ip,
          status: 'installed' as const,
          platformStatus: d.status,
          offlineSince: change.offlineSince,
          syncedAt: ctx.now,
          createdAt: ctx.now,
        });
      }
      if (change.event === 'went_offline') event(change.event, id, d.sn, change.offlineSince);
      if (change.event === 'offline_ended' && was?.offlineSince) {
        event(change.event, id, d.sn, was.offlineSince);
        offlineEnded.push({ deviceId: id, sn: d.sn, offlineSince: was.offlineSince.toISOString() });
      }
    }
    await insertDevices(ctx.tx, rows);
    // Channels → gates (07-integrations): a gate is a zone of this project, matched on its platform ref (zones
    // sync first). A gate OCS does not know leaves the channel unbound and is reported; channels the platform no
    // longer lists are unbound, never deleted.
    const gates = await activeGatesOf(ctx.tx, project.id);
    const unknownGates = new Set<string>();
    const bindings = channelsOf.flatMap(({ deviceId, channels }) =>
      channels.map((c) => {
        const zoneId = c.gateRef === null ? null : (gates.get(c.gateRef) ?? null);
        if (c.gateRef !== null && zoneId === null) unknownGates.add(c.gateRef);
        return { deviceId, channelNo: c.no, clientId: project.clientId, siteId: project.id, zoneId };
      }),
    );
    await upsertChannels(ctx.tx, bindings);
    await unbindChannelsNotIn(
      ctx.tx,
      channelsOf.map(({ deviceId, channels }) => ({ deviceId, nos: channels.map((c) => c.no) })),
    );
    /** Reconciliation, the other way: registered in OCS on this project, but the platform does not list it. */
    const notOnPlatform = await registeredNotListed(
      ctx.tx,
      project.id,
      i.devices.map((d) => d.sn),
    );

    const result = {
      added: rows.length,
      updated,
      elsewhere,
      offlineEnded,
      notRegistered: notRegistered.sort(),
      notOnPlatform,
      channelsBound: bindings.filter((b) => b.zoneId !== null).length,
      unknownGates: [...unknownGates].sort(),
    };
    return {
      result,
      audit: {
        objectType: 'site',
        objectId: project.id,
        clientId: project.clientId,
        before: null,
        after: result,
      },
    };
  },
});
