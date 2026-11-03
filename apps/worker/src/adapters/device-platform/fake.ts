// In-memory device platform for tests and local development (ocs-integration §1). Anonymised: Mall A,
// Store A1, Gate 1. Tests change device status to simulate offline / back online.
import type { DevicePlatform } from './client.ts';
import type { Device, Gate, Plaza } from './schema.ts';

export interface FakePlatformWorld {
  readonly malls: Plaza[];
  readonly areas: Record<string, Plaza[]>;
  readonly gates: Record<string, Gate[]>;
  readonly devices: Record<string, Device[]>;
}

export function fakeDevicePlatform(
  world: FakePlatformWorld,
): DevicePlatform & { setStatus(sn: string, status: number): void } {
  return {
    malls: () => Promise.resolve(world.malls),
    areas: (mall) => Promise.resolve(world.areas[mall] ?? []),
    gates: (plaza) => Promise.resolve(world.gates[plaza] ?? []),
    devices: (plaza) => Promise.resolve(world.devices[plaza] ?? []),
    setStatus(sn, status) {
      for (const list of Object.values(world.devices)) {
        for (const [i, d] of list.entries()) if (d.serialnum === sn) list[i] = { ...d, status };
      }
    },
  };
}

/** A small default world: one mall, one store, two gates, two devices (one per gate). */
export function sampleWorld(): FakePlatformWorld {
  const mall = { plazaUnid: 'mall-a', plazaName: 'Mall A', cityName: 'Madrid', timeZone: 'Europe/Madrid' };
  const store = { plazaUnid: 'store-a1', plazaName: 'Store A1', cityName: 'Madrid' };
  const gate = (n: number, plazaUnid: string, isMallGate: number): Gate => ({
    plazaUnid,
    gateUnid: `gate-${String(n)}`,
    gateName: `Gate ${String(n)}`,
    isMallGate,
    gateStatus: 1,
  });
  const device = (sn: string, gateUnid: string): Device => ({
    serialnum: sn,
    mac: '00-10-ff-00-00-01',
    status: 1,
    localIp: '192.168.2.10',
    hardware: 'G6',
    channelList: [{ channelNo: '01', serialnum: `${sn}-01`, site: { gateUnid } }],
  });
  return {
    malls: [mall],
    areas: { 'mall-a': [store] },
    gates: { 'mall-a': [gate(1, 'mall-a', 1)], 'store-a1': [gate(2, 'store-a1', 0)] },
    devices: { 'mall-a': [device('SN-0001', 'gate-1'), device('SN-0002', 'gate-2')] },
  };
}
