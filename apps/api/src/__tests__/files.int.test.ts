// D-46 (1): an uploaded file goes to the object store under a key OCS makes, with its SHA-256 and size, and is recorded
// through files.file.store; a refused file leaves nothing behind in the store. Anonymised data only.
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { openTestKernel, RuleViolation, type TestKernel } from '@ocs/core/kernel';
import { createClient, createSite } from '@ocs/core/org';
import { storeFile } from '@ocs/core/files';
import { receiveFile } from '../files.ts';
import { localObjectStore } from '../object-store.ts';

const pm = aStaffActor({ roles: ['pm'] });
let testDb: TestDatabase;
let t: TestKernel;
let dir: string;
let siteId: string;
const form = (name: string, type: string, text: string) => {
  const f = new FormData();
  f.set('file', new File([text], name, { type }));
  f.set('ownerType', 'commercial_record');
  f.set('sopFolder', '01');
  return f;
};
const filesIn = async (d: string): Promise<string[]> =>
  (await readdir(d, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission, storeFile.permission);
  dir = await mkdtemp(join(tmpdir(), 'ocs-files-'));
  const a = await t.kernel.execute(createClient, pm, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  ({ id: siteId } = await t.kernel.execute(
    createSite,
    pm,
    {
      clientId: a.id,
      countryCode: 'ES',
      cityCode: 'MAD',
      cityName: 'Madrid',
      standard: 'S',
      name: 'Store 001',
    },
    'test',
  ));
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
  await rm(dir, { recursive: true, force: true });
});

describe('receiveFile (D-46)', () => {
  it('stores the bytes and records hash, size and type', async () => {
    const out = await receiveFile(
      t,
      localObjectStore(dir),
      pm,
      siteId,
      form('PO-1.pdf', 'application/pdf', 'PO one'),
    );
    expect(out.status).toBe(201);
    const sha = createHash('sha256').update('PO one').digest('hex');
    expect(
      await countRows(
        testDb.url,
        "stored_file WHERE sha256 = $1 AND size_bytes = 6 AND mime_type = 'application/pdf'",
        [sha],
      ),
    ).toBe(1);
    expect(await filesIn(dir)).toHaveLength(1);
  });

  it('a refused file leaves nothing in the store', async () => {
    await expect(
      receiveFile(t, localObjectStore(dir), pm, siteId, form('tool.exe', 'application/x-msdownload', 'MZ')),
    ).rejects.toBeInstanceOf(RuleViolation);
    expect(await filesIn(dir)).toHaveLength(1);
  });

  it('asks for the file field', async () => {
    const f = new FormData();
    f.set('ownerType', 'commercial_record');
    expect((await receiveFile(t, localObjectStore(dir), pm, siteId, f)).status).toBe(400);
  });
});
