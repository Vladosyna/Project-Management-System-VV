// The seed world matches 04-testing §7 and the SOP rules the real data must follow.
import { describe, expect, it } from 'vitest';
import { buildSeedWorld, clientLabel, partnerLabel, siteLabel } from '../index.ts';

const world = buildSeedWorld();

describe('seed world (04-testing §7)', () => {
  it('has 3 clients, 12 sites, 60 devices, 10 cases, 15 actions', () => {
    expect(
      [world.clients, world.sites, world.devices, world.cases, world.actions].map((x) => x.length),
    ).toEqual([3, 12, 60, 10, 15]);
  });

  it('covers the three project shapes: L network-heavy, platform-heavy, S programme', () => {
    expect(world.clients.map((c) => c.shape)).toEqual([
      'standard-L network-heavy',
      'platform/algorithm-heavy',
      'standard-S programme',
    ]);
  });

  it('is deterministic', () => {
    expect(buildSeedWorld()).toEqual(world);
  });
});

describe('follows the SOP rules real data must follow', () => {
  it('Project IDs are CLIENT-CC-CITY-NNN, unique, numbered per client and city from 001 (SOP-DEL-02 §3)', () => {
    const ids = world.sites.map((s) => s.projectId);
    for (const id of ids) expect(id).toMatch(/^[A-Z]{1,8}-[A-Z]{2}-[A-Z]{3}-\d{3}$/);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id.startsWith('CLIENTC-PT-LIS-'))).toEqual([
      'CLIENTC-PT-LIS-001',
      'CLIENTC-PT-LIS-002',
      'CLIENTC-PT-LIS-003',
    ]);
  });

  it('Standard S sites have at most 20 sensors (SOP-DEL-02 §2)', () => {
    for (const site of world.sites.filter((s) => s.standard === 'S')) {
      expect(world.devices.filter((d) => d.projectId === site.projectId).length).toBeLessThanOrEqual(20);
    }
  });

  it('serial numbers and MAC addresses are unique (R6) and MACs are locally administered test addresses', () => {
    expect(new Set(world.devices.map((d) => d.sn)).size).toBe(60);
    expect(new Set(world.devices.map((d) => d.mac)).size).toBe(60);
    for (const d of world.devices) expect(d.mac).toMatch(/^02:00:00:00:[0-9a-f]{2}:[0-9a-f]{2}$/);
  });

  it('cases are numbered CS-nnnn and point at existing sites of their client', () => {
    for (const c of world.cases) {
      expect(c.number).toMatch(/^CS-\d{4}$/);
      expect(world.sites.find((s) => s.projectId === c.projectId)?.client).toBe(c.client);
    }
  });

  it('partners appear only as labels (CLAUDE.md §3 rule 5)', () => {
    expect(world.partners).toEqual(['Partner A', 'Partner B']);
    for (const s of world.sites) expect([null, ...world.partners]).toContain(s.partner);
  });
});

describe('labels', () => {
  it('produce anonymised names', () => {
    expect([clientLabel(0), partnerLabel(2), siteLabel(7)]).toEqual(['Client A', 'Partner C', 'Site 007']);
    expect(() => clientLabel(26)).toThrow();
  });
});
