// Device platform job: what it asks core to do, given the fake platform. Core commands have their own
// integration tests; here a recording kernel stands in for them.
import { describe, expect, it } from 'vitest';
import { fakeDevicePlatform, sampleWorld } from '../../adapters/device-platform/index.ts';
import { r15Ref, runDevicePlatformJob } from '../device-platform.ts';

interface Call {
  name: string;
  input: Record<string, unknown>;
}

function recordingKernel(answers: {
  sites: { siteId: string; projectId: string; platformRef: string; alertsEnabled: boolean }[];
  sync?: Partial<{ offlineEnded: unknown[]; notRegistered: string[]; notOnPlatform: string[] }>;
  due?: unknown[];
  failZonesFor?: string;
}) {
  const calls: Call[] = [];
  const reply = (name: string, input: Record<string, unknown>): unknown => {
    calls.push({ name, input });
    if (name === 'devices.platformSites.read') return answers.sites;
    if (name === 'devices.offline.due') return answers.due ?? [];
    if (name === 'devices.platform.syncZones' && input.siteId === answers.failZonesFor)
      throw new Error('boom');
    if (name === 'devices.platform.syncDevices') {
      return { offlineEnded: [], notRegistered: [], notOnPlatform: [], ...answers.sync };
    }
    if (name === 'work.alert.resolve') return { withdrawn: [{ ref: 'x', actionId: 'y' }] };
    if (name === 'work.alert.raise') return { created: [{}], existing: 0, skipped: [] };
    return {};
  };
  const kernel = {
    execute: (cmd: { name: string }, _actor: unknown, input: unknown) =>
      Promise.resolve(reply(cmd.name, input as Record<string, unknown>)),
    read: (query: { name: string }, _actor: unknown, input: unknown) =>
      Promise.resolve(reply(query.name, input as Record<string, unknown>)),
  };
  return { kernel: kernel as unknown as Parameters<typeof runDevicePlatformJob>[0], calls };
}

const site = {
  siteId: 'site-a',
  projectId: 'CLIENTA-ES-MAD-001',
  platformRef: 'mall-a',
  alertsEnabled: true,
};
const of = (calls: Call[], name: string) => calls.filter((c) => c.name === name).map((c) => c.input);

describe('device platform job', () => {
  it("syncs a linked mall's zones (stores, mall and store gates) and devices, as the platform names them", async () => {
    const k = recordingKernel({ sites: [site] });
    await runDevicePlatformJob(k.kernel, fakeDevicePlatform(sampleWorld()));
    expect(of(k.calls, 'devices.platform.syncZones')).toEqual([
      {
        siteId: 'site-a',
        zones: [
          { ref: 'store-a1', kind: 'area', name: 'Store A1' },
          { ref: 'gate-1', kind: 'gate', name: 'Gate 1', entrance: true },
          { ref: 'gate-2', kind: 'gate', name: 'Gate 2', entrance: false },
        ],
      },
    ]);
    const [devices] = of(k.calls, 'devices.platform.syncDevices');
    expect(devices?.devices).toEqual([
      {
        sn: 'SN-0001',
        model: 'G6',
        status: 'online',
        channels: [{ no: 1, gateRef: 'gate-1' }],
        mac: '00-10-ff-00-00-01',
        ip: '192.168.2.10',
      },
      {
        sn: 'SN-0002',
        model: 'G6',
        status: 'online',
        channels: [{ no: 1, gateRef: 'gate-2' }],
        mac: '00-10-ff-00-00-01',
        ip: '192.168.2.10',
      },
    ]);
  });

  it('withdraws the R15 action of a device back online, and raises R15 for devices offline > 24 h', async () => {
    const k = recordingKernel({
      sites: [site],
      sync: { offlineEnded: [{ deviceId: 'd1', sn: 'SN-0001', offlineSince: '2026-11-12T08:00:00.000Z' }] },
      due: [
        {
          deviceId: 'd2',
          sn: 'SN-0002',
          siteId: 'site-a',
          projectId: 'CLIENTA-ES-MAD-001',
          pmId: 'pm',
          offlineSince: new Date('2026-11-11T07:30:00Z'),
        },
      ],
    });
    const run = await runDevicePlatformJob(k.kernel, fakeDevicePlatform(sampleWorld()));
    expect(of(k.calls, 'work.alert.resolve')[0]).toEqual({
      refs: [r15Ref('d1', '2026-11-12T08:00:00.000Z')],
      reason: 'Device back online',
    });
    expect(of(k.calls, 'work.alert.raise').at(-1)).toEqual({
      alerts: [
        {
          siteId: 'site-a',
          ref: 'R15:d2:2026-11-11T07:30:00.000Z',
          title: 'Device SN-0002 on CLIENTA-ES-MAD-001 offline since 2026-11-11 07:30 UTC — find the cause',
        },
      ],
    });
    expect(run.offlineRaised).toBe(1);
  });

  it('reconciliation: one action per centre that names both lists, replacing older versions', async () => {
    const k = recordingKernel({
      sites: [site],
      sync: { notRegistered: ['SN-0002'], notOnPlatform: ['SN-0009'] },
    });
    await runDevicePlatformJob(k.kernel, fakeDevicePlatform(sampleWorld()));
    const [raised] = of(k.calls, 'work.alert.raise');
    const alert = (raised?.alerts as { ref: string; title: string }[])[0];
    expect(alert?.ref).toMatch(/^RECON:site-a:[0-9a-f]{16}$/);
    expect(alert?.title).toContain('(SN-0002)');
    expect(alert?.title).toContain('(SN-0009)');
    expect(of(k.calls, 'work.alert.resolve')).toEqual([
      {
        refs: [],
        reason: 'Device lists changed',
        superseded: { prefix: 'RECON:site-a:', keep: alert?.ref },
      },
    ]);
  });

  it('reconciled lists withdraw the action; alerts off raises nothing; one failing centre does not stop the run', async () => {
    const off = { ...site, siteId: 'site-b', alertsEnabled: false };
    const broken = { ...site, siteId: 'site-c' };
    const k = recordingKernel({ sites: [site, off, broken], failZonesFor: 'site-c' });
    const run = await runDevicePlatformJob(k.kernel, fakeDevicePlatform(sampleWorld()));
    expect(of(k.calls, 'work.alert.resolve')).toEqual([
      { refs: [], reason: 'Device lists reconciled', superseded: { prefix: 'RECON:site-a:', keep: null } },
    ]);
    expect(of(k.calls, 'work.alert.raise')).toEqual([]);
    expect(of(k.calls, 'devices.platform.syncDevices').map((c) => c.siteId)).toEqual(['site-a', 'site-b']);
    expect(run.failed).toEqual([{ siteId: 'site-c', error: 'Error' }]);
  });
});
