// The anonymised seed world (04-testing §7): a believable copy of the mockup structure with no real
// names — 3 clients of different shape, 12 sites, 60 devices, 10 cases, 15 actions. Pure data and
// deterministic; each module loads its part through its own commands once its tables exist (E1+).

export type Standard = 'L' | 'S';
export type CaseType =
  'bug' | 'data' | 'feature' | 'configuration' | 'hardware' | 'network' | 'infrastructure' | 'question';
export type CaseStatus =
  'new' | 'triaged' | 'in_progress' | 'waiting' | 'fix_ready' | 'verifying' | 'resolved' | 'closed';

export interface SeedClient {
  readonly key: 'A' | 'B' | 'C';
  readonly label: string;
  /** ≤ 8 letters, first segment of the Project ID (SOP-DEL-02 §3). */
  readonly shortCode: string;
  readonly shape: 'standard-L network-heavy' | 'platform/algorithm-heavy' | 'standard-S programme';
  readonly programme: string | null;
}

export interface SeedSite {
  /** CLIENT-CC-CITY-NNN (SOP-DEL-02 §3, D-18). */
  readonly projectId: string;
  readonly client: SeedClient['key'];
  readonly name: string;
  readonly country: string;
  readonly city: string;
  readonly timeZone: string;
  readonly standard: Standard;
  readonly packageType: 'Full' | 'Light';
  readonly partner: string | null;
}

export interface SeedDevice {
  readonly sn: string;
  readonly mac: string;
  readonly model: 'G6' | 'G6S' | 'G6 WiFi' | 'B1' | 'CBox';
  readonly projectId: string;
  readonly status: 'planned' | 'shipped' | 'installed' | 'online' | 'calibrated' | 'faulty';
}

export interface SeedCase {
  readonly number: string;
  readonly client: SeedClient['key'];
  readonly projectId: string;
  readonly type: CaseType;
  readonly priority: 'P0' | 'P1' | 'P2';
  readonly status: CaseStatus;
  readonly clientTitle: string;
}

export interface SeedAction {
  readonly title: string;
  readonly projectId: string;
  readonly source: 'mail' | 'dingtalk' | 'meeting' | 'visit' | 'alert' | 'comment';
  readonly dueInDays: number;
  readonly status: 'open' | 'done';
}

export interface SeedWorld {
  readonly clients: readonly SeedClient[];
  readonly partners: readonly string[];
  readonly sites: readonly SeedSite[];
  readonly devices: readonly SeedDevice[];
  readonly cases: readonly SeedCase[];
  readonly actions: readonly SeedAction[];
}

const clients: SeedClient[] = [
  { key: 'A', label: 'Client A', shortCode: 'CLIENTA', shape: 'standard-L network-heavy', programme: null },
  { key: 'B', label: 'Client B', shortCode: 'CLIENTB', shape: 'platform/algorithm-heavy', programme: null },
  {
    key: 'C',
    label: 'Client C',
    shortCode: 'CLIENTC',
    shape: 'standard-S programme',
    programme: 'Programme 1',
  },
];

const siteSpecs: (Omit<SeedSite, 'projectId' | 'name'> & { devices: [SeedDevice['model'], number][] })[] = [
  // Client A — two large network-heavy sites in one city.
  ...[0, 1].map(() => ({
    client: 'A' as const,
    country: 'ES',
    city: 'MAD',
    timeZone: 'Europe/Madrid',
    standard: 'L' as const,
    packageType: 'Full' as const,
    partner: 'Partner A',
    devices: [['G6', 15]] as [SeedDevice['model'], number][],
  })),
  // Client B — platform/algorithm-heavy sites with an edge terminal each.
  {
    client: 'B',
    country: 'DE',
    city: 'HAM',
    timeZone: 'Europe/Berlin',
    standard: 'L',
    packageType: 'Full',
    partner: null,
    devices: [
      ['G6S', 6],
      ['CBox', 1],
    ],
  },
  {
    client: 'B',
    country: 'AT',
    city: 'VIE',
    timeZone: 'Europe/Vienna',
    standard: 'L',
    packageType: 'Light',
    partner: null,
    devices: [
      ['G6S', 6],
      ['CBox', 1],
    ],
  },
  // Client C — a programme of small Standard S stores across several cities.
  ...(['LIS', 'LIS', 'LIS', 'OPO', 'OPO', 'BRG', 'FAO', 'AVE'] as const).map((city) => ({
    client: 'C' as const,
    country: 'PT',
    city,
    timeZone: 'Europe/Lisbon',
    standard: 'S' as const,
    packageType: 'Full' as const,
    partner: 'Partner B',
    devices: [['G6 WiFi', 2]] as [SeedDevice['model'], number][],
  })),
];

const deviceStatuses: SeedDevice['status'][] = [
  'online',
  'online',
  'calibrated',
  'installed',
  'shipped',
  'faulty',
];

const caseSpecs: Omit<SeedCase, 'number' | 'client' | 'projectId'>[] = [
  { type: 'data', priority: 'P1', status: 'in_progress', clientTitle: 'Visitor counts lower than expected' },
  { type: 'network', priority: 'P0', status: 'triaged', clientTitle: 'Sensors offline after network change' },
  { type: 'feature', priority: 'P2', status: 'waiting', clientTitle: 'Request: occupancy view per zone' },
  { type: 'bug', priority: 'P1', status: 'fix_ready', clientTitle: 'Dashboard shows a gap on Sunday' },
  { type: 'configuration', priority: 'P2', status: 'verifying', clientTitle: 'Opening hours not applied' },
  { type: 'hardware', priority: 'P1', status: 'new', clientTitle: 'Sensor does not power on' },
  { type: 'question', priority: 'P2', status: 'resolved', clientTitle: 'How is staff traffic excluded?' },
  {
    type: 'infrastructure',
    priority: 'P1',
    status: 'waiting',
    clientTitle: 'Fixed IP addresses not yet assigned',
  },
  {
    type: 'data',
    priority: 'P2',
    status: 'closed',
    clientTitle: 'Hourly export missing one hour after time change',
  },
  { type: 'bug', priority: 'P0', status: 'in_progress', clientTitle: 'Counts doubled at the main entrance' },
];

const actionSpecs: Omit<SeedAction, 'projectId'>[] = [
  { title: 'Send installation plan for review', source: 'meeting', dueInDays: 2, status: 'open' },
  { title: 'Confirm fixed IP per sensor', source: 'mail', dueInDays: 1, status: 'open' },
  { title: 'Book access for installation day', source: 'visit', dueInDays: 5, status: 'open' },
  { title: 'Share calibration results', source: 'dingtalk', dueInDays: -1, status: 'open' },
  { title: 'Request completed site information card', source: 'alert', dueInDays: 3, status: 'open' },
  { title: 'Check cable routes with the installer', source: 'visit', dueInDays: 4, status: 'done' },
  { title: 'Prepare acceptance form', source: 'meeting', dueInDays: 7, status: 'open' },
  { title: 'Reply on data retention question', source: 'mail', dueInDays: 0, status: 'open' },
  { title: 'Update device list after replacement', source: 'comment', dueInDays: 2, status: 'open' },
  { title: 'Confirm go/no-go with site manager', source: 'meeting', dueInDays: 1, status: 'open' },
  { title: 'Send monthly service summary', source: 'mail', dueInDays: 10, status: 'open' },
  { title: 'Verify firmware version on all sensors', source: 'alert', dueInDays: -2, status: 'open' },
  { title: 'Agree installation date', source: 'dingtalk', dueInDays: 6, status: 'done' },
  { title: 'Collect floor plan', source: 'mail', dueInDays: 3, status: 'open' },
  { title: 'Record visit minutes', source: 'visit', dueInDays: 0, status: 'done' },
];

function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

export function buildSeedWorld(): SeedWorld {
  const running = new Map<string, number>();
  const sites: SeedSite[] = [];
  const devices: SeedDevice[] = [];
  let deviceNo = 0;
  siteSpecs.forEach((spec, i) => {
    const client = clients.find((c) => c.key === spec.client);
    if (!client) throw new Error(`Unknown client ${spec.client}`);
    const key = `${client.shortCode}-${spec.country}-${spec.city}`;
    const nnn = (running.get(key) ?? 0) + 1;
    running.set(key, nnn);
    const { devices: deviceSpec, ...site } = spec;
    const projectId = `${key}-${String(nnn).padStart(3, '0')}`;
    sites.push({ ...site, projectId, name: `Site ${String(i + 1).padStart(3, '0')}` });
    for (const [model, count] of deviceSpec) {
      for (let k = 0; k < count; k++) {
        deviceNo++;
        devices.push({
          sn: `TST${spec.client}${String(deviceNo).padStart(5, '0')}`,
          // Locally administered unicast range (02:…): can never collide with a real device MAC.
          mac: `02:00:00:00:${hex2(Math.floor(deviceNo / 256))}:${hex2(deviceNo % 256)}`,
          model,
          projectId,
          status: deviceStatuses[deviceNo % deviceStatuses.length] ?? 'planned',
        });
      }
    }
  });

  const cases: SeedCase[] = caseSpecs.map((spec, i) => {
    const site = sites[(i * 5) % sites.length];
    if (!site) throw new Error('No sites');
    return {
      ...spec,
      number: `CS-${String(i + 1).padStart(4, '0')}`,
      client: site.client,
      projectId: site.projectId,
    };
  });

  const actions: SeedAction[] = actionSpecs.map((spec, i) => {
    const site = sites[(i * 7) % sites.length];
    if (!site) throw new Error('No sites');
    return { ...spec, projectId: site.projectId };
  });

  return Object.freeze({
    clients,
    partners: ['Partner A', 'Partner B'],
    sites,
    devices,
    cases,
    actions,
  });
}
