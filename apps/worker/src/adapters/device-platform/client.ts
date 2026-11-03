// Device platform client (VION Footfall 2.0 OpenAPI v2) — read only: malls, stores/areas, gates, devices.
// OCS never writes to the platform (07-integrations.md). Credentials come from the secret store through
// the caller; nothing here logs them, the token or response bodies.
import type { z } from 'zod';
import { encryptPassword } from './crypto.ts';
import { Device, envelope, Gate, LoginData, Plaza } from './schema.ts';

export interface PlatformCredentials {
  readonly baseUrl: string;
  readonly username: string;
  readonly password: string;
  readonly appkey: string;
}

export interface DevicePlatform {
  /** Malls the account can see. */
  malls(): Promise<Plaza[]>;
  /** Stores/areas of a mall. */
  areas(mallUnid: string): Promise<Plaza[]>;
  /** Entrances of a mall or a store/area. */
  gates(plazaUnid: string): Promise<Gate[]>;
  /** Devices under a mall or a store/area, with their channel → gate bindings and current status. */
  devices(plazaUnid: string): Promise<Device[]>;
}

export class PlatformError extends Error {}

type Fetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{
  status: number;
  json(): Promise<unknown>;
}>;

export interface ClientOptions {
  readonly fetch?: Fetch;
  /** Attempts per request on network errors and 5xx (with backoff). Default 3. */
  readonly attempts?: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export function createDevicePlatform(
  creds: PlatformCredentials,
  options: ClientOptions = {},
): DevicePlatform {
  const doFetch: Fetch = options.fetch ?? globalThis.fetch;
  const attempts = options.attempts ?? 3;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const base = creds.baseUrl.replace(/\/$/, '');
  let token: string | undefined;

  async function send(
    path: string,
    init: { method: string; headers: Record<string, string>; body?: string },
  ) {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await doFetch(`${base}${path}`, init);
        if (res.status >= 500 && attempt < attempts) throw new PlatformError(`HTTP ${String(res.status)}`);
        return res;
      } catch (err) {
        if (attempt >= attempts)
          throw err instanceof PlatformError ? err : new PlatformError(`${path}: unreachable`);
        await sleep(250 * 2 ** (attempt - 1));
      }
    }
  }

  async function login(): Promise<string> {
    const body = JSON.stringify({
      username: creds.username,
      password: encryptPassword(creds.password, creds.appkey),
    });
    const res = await send('/api/v2/user/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const parsed = envelope(LoginData).safeParse(await res.json());
    if (!parsed.success || !parsed.data.success) throw new PlatformError('login refused');
    return parsed.data.data.atoken;
  }

  async function get<T extends z.ZodType>(path: string, schema: T, retried = false): Promise<z.infer<T>[]> {
    token ??= await login();
    const res = await send(path, { method: 'GET', headers: { Authorization: token } });
    if (res.status === 401 && !retried) {
      token = undefined; // expired: log in once more
      return get(path, schema, true);
    }
    const parsed = envelope(schema.array()).safeParse(await res.json());
    if (!parsed.success) throw new PlatformError(`${path}: unexpected response shape`);
    if (!parsed.data.success) throw new PlatformError(`${path}: refused (code ${String(parsed.data.code)})`);
    return parsed.data.data;
  }

  const q = (unid: string) => `?plazaUnid=${encodeURIComponent(unid)}`;
  return {
    malls: () => get('/api/v2/base/plazaInfo', Plaza),
    areas: (mallUnid) => get(`/api/v2/base/areaInfo${q(mallUnid)}`, Plaza),
    gates: (plazaUnid) => get(`/api/v2/base/gateInfo${q(plazaUnid)}`, Gate),
    devices: (plazaUnid) => get(`/api/v2/base/device${q(plazaUnid)}`, Device),
  };
}
