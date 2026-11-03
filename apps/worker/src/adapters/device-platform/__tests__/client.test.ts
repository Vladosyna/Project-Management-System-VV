// Device platform client: login encryption, token reuse and re-login, retries, response shapes. A scripted
// fetch stands in for the platform; no network.
import { createDecipheriv } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDevicePlatform, PlatformError } from '../client.ts';
import { encryptPassword } from '../crypto.ts';
import { fakeDevicePlatform, sampleWorld } from '../fake.ts';
import { statusOf } from '../schema.ts';

const APPKEY = 'k'.repeat(24); // test key only
const creds = {
  baseUrl: 'https://platform.test/openapi/',
  username: 'user',
  password: 'pass',
  appkey: APPKEY,
};
const ok = (data: unknown) => ({ code: 200, success: true, msg: '', data });

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}
function scripted(responses: { status: number; body?: unknown; throws?: boolean }[]) {
  const calls: Call[] = [];
  const fetch = (url: string, init: Omit<Call, 'url'>) => {
    calls.push({ url, ...init });
    const next = responses.shift();
    if (!next) throw new Error('no more scripted responses');
    if (next.throws) return Promise.reject(new Error('ECONNRESET'));
    return Promise.resolve({ status: next.status, json: () => Promise.resolve(next.body) });
  };
  return { fetch, calls };
}
const noSleep = () => Promise.resolve();

describe('device platform client', () => {
  it('encrypts the password with AES-192-ECB/PKCS7 and Base64, as the login API expects', () => {
    const cipher = encryptPassword('pass', APPKEY);
    const decipher = createDecipheriv('aes-192-ecb', Buffer.from(APPKEY), null);
    expect(Buffer.concat([decipher.update(Buffer.from(cipher, 'base64')), decipher.final()]).toString()).toBe(
      'pass',
    );
    expect(() => encryptPassword('pass', 'short')).toThrow(/24 bytes/);
  });

  it('logs in once, then sends the token on every call', async () => {
    const s = scripted([
      { status: 200, body: ok({ atoken: 'token-1' }) },
      { status: 200, body: ok([{ plazaUnid: 'mall-a', plazaName: 'Mall A' }]) },
      { status: 200, body: ok([]) },
    ]);
    const p = createDevicePlatform(creds, { fetch: s.fetch, sleep: noSleep });
    expect((await p.malls()).map((m) => m.plazaName)).toEqual(['Mall A']);
    await p.devices('mall-a');
    expect(s.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST https://platform.test/openapi/api/v2/user/login',
      'GET https://platform.test/openapi/api/v2/base/plazaInfo',
      'GET https://platform.test/openapi/api/v2/base/device?plazaUnid=mall-a',
    ]);
    expect(s.calls[1]?.headers.Authorization).toBe('token-1');
    expect(s.calls[0]?.body).not.toContain('"pass"'); // never the clear password
  });

  it('logs in again once when the token has expired (401)', async () => {
    const s = scripted([
      { status: 200, body: ok({ atoken: 'old' }) },
      { status: 401, body: {} },
      { status: 200, body: ok({ atoken: 'new' }) },
      { status: 200, body: ok([]) },
    ]);
    await createDevicePlatform(creds, { fetch: s.fetch, sleep: noSleep }).gates('mall-a');
    expect(s.calls.at(-1)?.headers.Authorization).toBe('new');
  });

  it('retries network errors and 5xx with backoff, then gives up', async () => {
    const s = scripted([
      { status: 200, body: ok({ atoken: 't' }) },
      { status: 0, throws: true },
      { status: 503, body: {} },
      { status: 200, body: ok([]) },
    ]);
    await expect(
      createDevicePlatform(creds, { fetch: s.fetch, sleep: noSleep }).areas('mall-a'),
    ).resolves.toEqual([]);
    const dead = scripted([
      { status: 200, body: ok({ atoken: 't' }) },
      { status: 0, throws: true },
      { status: 0, throws: true },
      { status: 0, throws: true },
    ]);
    await expect(
      createDevicePlatform(creds, { fetch: dead.fetch, sleep: noSleep }).areas('mall-a'),
    ).rejects.toBeInstanceOf(PlatformError);
  });

  it('fails loudly on a refused login or a changed response shape', async () => {
    const refused = scripted([
      { status: 200, body: { code: 401, success: false, msg: 'bad password', data: null } },
    ]);
    await expect(createDevicePlatform(creds, { fetch: refused.fetch }).malls()).rejects.toThrow(
      /login refused/,
    );
    const changed = scripted([
      { status: 200, body: ok({ atoken: 't' }) },
      { status: 200, body: ok([{ sn: 'no serialnum field' }]) },
    ]);
    await expect(createDevicePlatform(creds, { fetch: changed.fetch }).devices('mall-a')).rejects.toThrow(
      /unexpected response shape/,
    );
  });

  it('maps device status codes; the fake world lets tests take a device offline', async () => {
    expect([statusOf(0), statusOf(1), statusOf(3), statusOf(9)]).toEqual([
      'offline',
      'online',
      'disabled',
      'unknown',
    ]);
    const fake = fakeDevicePlatform(sampleWorld());
    fake.setStatus('SN-0002', 0);
    expect((await fake.devices('mall-a')).map((d) => [d.serialnum, statusOf(d.status)])).toEqual([
      ['SN-0001', 'online'],
      ['SN-0002', 'offline'],
    ]);
  });
});
