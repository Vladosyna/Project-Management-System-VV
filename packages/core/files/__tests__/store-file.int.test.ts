// files — D-46 (1)(2): a stored file is recorded with hash, size, type and SOP folder; a person's upload is confirmed
// at once, an agent's or the market link's waits for a person; a new version archives the old one; only a confirmed
// file with a stored copy can be put into the DingTalk folder, once. Anonymised data only.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  Conflict,
  Forbidden,
  openTestKernel,
  RuleViolation,
  ValidationFailed,
  type TestKernel,
} from '../../kernel/index.ts';
import { createClient, createSite } from '../../org/index.ts';
import { confirmFile } from '../commands/confirm-file.ts';
import { requestUpload } from '../commands/request-upload.ts';
import { storeFile } from '../commands/store-file.ts';

const pm = aStaffActor({ roles: ['pm'] });
const agent = { ...pm, via: 'mcp:test-agent' };
const rnd = aStaffActor({ roles: ['rnd'] });
let testDb: TestDatabase;
let t: TestKernel;
let siteId: string;
const file = (more: Record<string, unknown> = {}) => ({
  siteId,
  ownerType: 'commercial_record',
  sopFolder: '01',
  objectKey: `eu/${randomUUID()}`,
  sha256: 'b'.repeat(64),
  sizeBytes: 2048,
  mimeType: 'application/pdf',
  originalName: 'PO-1.pdf',
  ...more,
});

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(pm, createClient.permission, createSite.permission);
  t.grant(pm, storeFile.permission, confirmFile.permission, requestUpload.permission);
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
});

describe('files (D-46)', () => {
  it("a person's file is confirmed at once and can be put in the DingTalk folder once", async () => {
    const { id, confirmed } = await t.kernel.execute(storeFile, pm, file(), 'test');
    expect(confirmed).toBe(true);
    await t.kernel.execute(requestUpload, pm, { fileId: id }, 'test');
    expect(
      await countRows(testDb.url, "dingtalk_upload WHERE file_id = $1 AND status = 'pending'", [id]),
    ).toBe(1);
    await expect(t.kernel.execute(requestUpload, pm, { fileId: id }, 'test')).rejects.toBeInstanceOf(
      Conflict,
    );
  });

  it('a file from the market link waits for a person; the agent can neither confirm nor upload', async () => {
    const { id, confirmed } = await t.kernel.execute(
      storeFile,
      pm,
      file({ arrivedVia: 'market_link' }),
      'test',
    );
    expect(confirmed).toBe(false);
    await expect(t.kernel.execute(requestUpload, pm, { fileId: id }, 'test')).rejects.toBeInstanceOf(
      RuleViolation,
    );
    await expect(t.kernel.execute(confirmFile, agent, { fileId: id }, 'test')).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(t.kernel.execute(requestUpload, agent, { fileId: id }, 'test')).rejects.toBeInstanceOf(
      Forbidden,
    );
    await t.kernel.execute(confirmFile, pm, { fileId: id }, 'test');
    await t.kernel.execute(requestUpload, pm, { fileId: id }, 'test');
  });

  it('a new version archives the previous one', async () => {
    const first = await t.kernel.execute(storeFile, pm, file(), 'test');
    const second = await t.kernel.execute(storeFile, pm, file({ supersedesId: first.id }), 'test');
    expect(second.version).toBe(2);
    expect(
      await countRows(testDb.url, 'stored_file WHERE id = $1 AND archived_at IS NOT NULL', [first.id]),
    ).toBe(1);
  });

  it('refuses a bad type, a too large file, the same stored object twice, and a role without the permission', async () => {
    await expect(
      t.kernel.execute(storeFile, pm, file({ mimeType: 'application/x-msdownload' }), 'test'),
    ).rejects.toBeInstanceOf(RuleViolation);
    await expect(
      t.kernel.execute(storeFile, pm, file({ sizeBytes: 200 * 1024 * 1024 }), 'test'),
    ).rejects.toBeInstanceOf(RuleViolation);
    const same = file();
    await t.kernel.execute(storeFile, pm, same, 'test');
    await expect(t.kernel.execute(storeFile, pm, same, 'test')).rejects.toBeInstanceOf(Conflict);
    await expect(t.kernel.execute(storeFile, pm, file({ sopFolder: '12' }), 'test')).rejects.toBeInstanceOf(
      ValidationFailed,
    );
    await expect(t.kernel.execute(storeFile, rnd, file(), 'test')).rejects.toBeInstanceOf(Forbidden);
  });
});
