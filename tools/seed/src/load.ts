// Loads the anonymised seed world (packages/testing/seed, 04-testing §7) through the core commands, so seed
// data passes the same permissions, rules, audit and RLS as real data (CLAUDE.md §3 rule 9). Each module
// adds its part here when its commands exist; today: clients, programme, sites, partners (E1).
import type { Actor } from '@ocs/contracts';
import type { Kernel } from '@ocs/core/kernel';
import {
  assignPartner,
  clientList,
  createClient,
  createPartner,
  createProgramme,
  createSite,
} from '@ocs/core/org';
import { buildSeedWorld } from '@ocs/testing';

/** The seed acts as a staff director with a fixed, recognisable id; its audit records show it. */
export const SEED_ACTOR: Actor = {
  id: '00000000-0000-4000-8000-000000005eed',
  kind: 'staff',
  clientIds: [],
  roles: ['director'],
};

/** Latin names for the seed's city codes; the seed world itself carries codes only. */
const CITY_NAMES: Record<string, string> = {
  MAD: 'Madrid',
  HAM: 'Hamburg',
  VIE: 'Vienna',
  LIS: 'Lisbon',
  OPO: 'Porto',
  BRG: 'Braga',
  FAO: 'Faro',
  AVE: 'Aveiro',
};

export interface SeedSummary {
  readonly clients: number;
  readonly sites: number;
  readonly partners: number;
}

/** Loads the seed into an empty database; refuses when any client exists already. */
export async function loadSeed(kernel: Kernel, actor: Actor = SEED_ACTOR): Promise<SeedSummary> {
  if ((await kernel.read(clientList, actor, {})).length > 0) {
    throw new Error('The database already has clients: the seed loads into an empty database only');
  }
  const world = buildSeedWorld();

  const clientIds = new Map<string, string>();
  const programmeIds = new Map<string, string>();
  for (const c of world.clients) {
    const { id } = await kernel.execute(
      createClient,
      actor,
      { shortCode: c.shortCode, name: c.label },
      'system',
    );
    clientIds.set(c.key, id);
    if (c.programme) {
      const p = await kernel.execute(createProgramme, actor, { clientId: id, name: c.programme }, 'system');
      programmeIds.set(c.key, p.id);
    }
  }

  for (const s of world.sites) {
    const clientId = clientIds.get(s.client) ?? '';
    const programmeId = programmeIds.get(s.client);
    await kernel.execute(
      createSite,
      actor,
      {
        clientId,
        ...(programmeId ? { programmeId } : {}),
        countryCode: s.country,
        cityCode: s.city,
        cityName: CITY_NAMES[s.city] ?? s.city,
        name: s.name,
        standard: s.standard,
      },
      'system',
    );
  }

  // One anonymised installer per seed label. Letters are per client in order of assignment, so every
  // client that works with "Partner B" also gets the first installer, which makes it "Partner B" there too.
  const installers: string[] = [];
  for (const [i] of world.partners.entries()) {
    const realName = `Installer Company ${String(i + 1).padStart(2, '0')}`;
    installers.push(
      (await kernel.execute(createPartner, actor, { realName, countryCode: 'ES' }, 'system')).id,
    );
  }
  for (const [key, clientId] of clientIds) {
    const labels = new Set(world.sites.filter((s) => s.client === key && s.partner).map((s) => s.partner));
    const needed = Math.max(0, ...[...labels].map((l) => world.partners.indexOf(l ?? '') + 1));
    for (const partnerId of installers.slice(0, needed)) {
      await kernel.execute(assignPartner, actor, { clientId, partnerId }, 'system');
    }
  }

  return { clients: clientIds.size, sites: world.sites.length, partners: installers.length };
}
