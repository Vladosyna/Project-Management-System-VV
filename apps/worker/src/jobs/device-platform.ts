// Device platform job (E4, 07-integrations "Device platform"). One run, for every project linked to a mall:
//   1. zones and 2. devices from the platform, through core commands as the system actor (the adapter never
//      writes tables, ocs-integration §3);
//   3. withdraws the R15 action of each device whose offline episode ended (Vlad, 4 Nov);
//   4. with the project's alerts checkbox on: one reconciliation action per centre — SNs on the platform not
//      registered in OCS, and the other way round — replaced when the lists change, withdrawn when they empty;
// then 5. R15: one "find the cause" action per device offline more than 24 h (devices.offline.due checks the
// checkbox). Internal actions only; nothing is sent to anyone outside (CLAUDE.md §3 rule 4). A project that
// fails is reported and the run goes on. Logs carry counts, never device or client details.
import { createHash } from 'node:crypto';
import { offlineDue, platformSites, syncDevices, syncZones } from '@ocs/core/devices';
import { systemActor, type Kernel } from '@ocs/core/kernel';
import { raiseAlert, resolveAlert } from '@ocs/core/work';
import { statusOf, type DevicePlatform } from '../adapters/device-platform/index.ts';

const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/;

export interface DevicePlatformRun {
  readonly sites: number;
  readonly failed: { readonly siteId: string; readonly error: string }[];
  readonly offlineRaised: number;
  readonly withdrawn: number;
}

/** R15 ref of one offline episode; the sync and the due query give the same ISO time. */
export const r15Ref = (deviceId: string, offlineSince: string) => `R15:${deviceId}:${offlineSince}`;

export async function runDevicePlatformJob(
  kernel: Pick<Kernel, 'execute' | 'read'>,
  platform: Pick<DevicePlatform, 'areas' | 'gates' | 'devices'>,
): Promise<DevicePlatformRun> {
  const actor = systemActor('device-platform');
  const failed: { siteId: string; error: string }[] = [];
  let withdrawn = 0;
  const sites = await kernel.read(platformSites, actor, {});
  for (const site of sites) {
    try {
      const areas = await platform.areas(site.platformRef);
      const gates = (
        await Promise.all(
          [site.platformRef, ...areas.map((a) => a.plazaUnid)].map((ref) => platform.gates(ref)),
        )
      ).flat();
      const zones = [
        ...areas.map((a) => ({ ref: a.plazaUnid, kind: 'area' as const, name: a.plazaName })),
        ...gates.map((g) => ({
          ref: g.gateUnid,
          kind: 'gate' as const,
          name: g.gateName,
          entrance: g.isMallGate === 1,
        })),
      ].filter((zn, i, all) => all.findIndex((other) => other.ref === zn.ref) === i);
      await kernel.execute(syncZones, actor, { siteId: site.siteId, zones }, 'system');

      const devices = (await platform.devices(site.platformRef)).flatMap((d) => {
        const status = statusOf(d.status);
        if (status === 'unknown') return [];
        const ip = d.localIp && IPV4.test(d.localIp) ? d.localIp : undefined;
        // An empty hardware name counts as unknown.
        const hardware = d.hardware?.trim() === '' ? undefined : d.hardware?.trim();
        return [
          {
            sn: d.serialnum,
            model: hardware ?? 'unknown',
            status,
            channels: (d.channelList ?? []).flatMap((c) => {
              const no = Number.parseInt(c.channelNo, 10);
              return Number.isInteger(no) && no >= 1 && no <= 64
                ? [{ no, gateRef: c.site?.gateUnid ?? null }]
                : [];
            }),
            ...(d.mac ? { mac: d.mac } : {}),
            ...(ip ? { ip } : {}),
          },
        ];
      });
      const sync = await kernel.execute(syncDevices, actor, { siteId: site.siteId, devices }, 'system');

      const ended = sync.offlineEnded.map((e) => r15Ref(e.deviceId, e.offlineSince));
      if (ended.length > 0) {
        const r = await kernel.execute(
          resolveAlert,
          actor,
          { refs: ended, reason: 'Device back online' },
          'system',
        );
        withdrawn += r.withdrawn.length;
      }

      if (site.alertsEnabled) {
        const prefix = `RECON:${site.siteId}:`;
        const { notRegistered, notOnPlatform } = sync;
        let keep: string | null = null;
        if (notRegistered.length > 0 || notOnPlatform.length > 0) {
          const hash = createHash('sha256')
            .update(JSON.stringify([notRegistered, notOnPlatform]))
            .digest('hex');
          keep = `${prefix}${hash.slice(0, 16)}`;
          const title = `Device list mismatch on ${site.projectId}: ${String(notRegistered.length)} on the platform not registered in OCS (${notRegistered.join(', ')}); ${String(notOnPlatform.length)} registered in OCS not on the platform (${notOnPlatform.join(', ')})`;
          await kernel.execute(
            raiseAlert,
            actor,
            { alerts: [{ siteId: site.siteId, ref: keep, title: title.slice(0, 300) }] },
            'system',
          );
        }
        const r = await kernel.execute(
          resolveAlert,
          actor,
          {
            refs: [],
            reason: keep ? 'Device lists changed' : 'Device lists reconciled',
            superseded: { prefix, keep },
          },
          'system',
        );
        withdrawn += r.withdrawn.length;
      }
    } catch (error) {
      failed.push({ siteId: site.siteId, error: error instanceof Error ? error.name : 'Error' });
    }
  }

  const due = await kernel.read(offlineDue, actor, {});
  const alerts = due.map((d) => {
    const since = d.offlineSince.toISOString();
    return {
      siteId: d.siteId,
      ref: r15Ref(d.deviceId, since),
      title: `Device ${d.sn} on ${d.projectId} offline since ${since.slice(0, 16).replace('T', ' ')} UTC — find the cause`,
    };
  });
  const raised = alerts.length > 0 ? await kernel.execute(raiseAlert, actor, { alerts }, 'system') : null;
  return { sites: sites.length, failed, offlineRaised: raised?.created.length ?? 0, withdrawn };
}
