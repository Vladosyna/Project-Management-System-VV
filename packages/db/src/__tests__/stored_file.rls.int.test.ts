// stored_file / dingtalk_upload — RLS and integrity (D-46): internal only; a file carries a valid hash, size and
// SOP-DEL-02 folder; one upload per file; an upload is 'uploaded' only with the DingTalk dentry and time.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@ocs/testing';
import {
  client,
  createDatabase,
  dingtalkUpload,
  inActorTransaction,
  migrateUp,
  storedFile,
  type Database,
  type DbActor,
} from '../index.ts';

const clientA = randomUUID();
const fileId = randomUUID();
const staff: DbActor = { id: randomUUID(), kind: 'staff', clientIds: [] };
const userOfA: DbActor = { id: randomUUID(), kind: 'client', clientIds: [clientA] };
const partnerOfA: DbActor = { id: randomUUID(), kind: 'partner', clientIds: [clientA] };
const file = (more: Partial<typeof storedFile.$inferInsert> = {}) => ({
  id: randomUUID(),
  clientId: clientA,
  ownerType: 'commercial_record' as const,
  sopFolder: '01',
  objectKey: `eu/${randomUUID()}`,
  sha256: 'a'.repeat(64),
  sizeBytes: 1024,
  mimeType: 'application/pdf',
  originalName: 'PO-1.pdf',
  uploadedBy: staff.id,
  uploadedVia: 'web' as const,
  ...more,
});
let testDb: TestDatabase;
let database: Database;
type Tx = Parameters<Parameters<typeof inActorTransaction>[2]>[0];
const asStaff = <T>(work: (tx: Tx) => Promise<T>) => inActorTransaction(database.db, staff, work);
const seen = (actor: DbActor) =>
  inActorTransaction(database.db, actor, async (tx) => [
    (await tx.select().from(storedFile)).length,
    (await tx.select().from(dingtalkUpload)).length,
  ]);

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  database = createDatabase(testDb.url);
  await migrateUp(database.pool);
  await asStaff(async (tx) => {
    await tx.insert(client).values({ id: clientA, shortCode: 'CLIENTA', name: 'Client A' });
    await tx.insert(storedFile).values(file({ id: fileId, confirmedBy: staff.id, confirmedAt: new Date() }));
    await tx
      .insert(dingtalkUpload)
      .values({ id: randomUUID(), clientId: clientA, fileId, requestedBy: staff.id });
  });
});

afterAll(async () => {
  await database.close();
  await testDb.drop();
});

it('staff see files and uploads; clients and partners never do', async () => {
  expect([await seen(staff), await seen(userOfA), await seen(partnerOfA)]).toEqual([
    [1, 1],
    [0, 0],
    [0, 0],
  ]);
});

it('a client cannot write', async () => {
  await expect(
    inActorTransaction(database.db, userOfA, (tx) => tx.insert(storedFile).values(file())),
  ).rejects.toThrow();
});

it('valid hash and SOP folder; one upload per file; uploaded needs the dentry', async () => {
  await expect(asStaff((tx) => tx.insert(storedFile).values(file({ sha256: 'xyz' })))).rejects.toThrow();
  await expect(asStaff((tx) => tx.insert(storedFile).values(file({ sopFolder: '12' })))).rejects.toThrow();
  await expect(
    asStaff((tx) =>
      tx
        .insert(dingtalkUpload)
        .values({ id: randomUUID(), clientId: clientA, fileId, requestedBy: staff.id }),
    ),
  ).rejects.toThrow();
  const other = randomUUID();
  await asStaff((tx) => tx.insert(storedFile).values(file({ id: other })));
  await expect(
    asStaff((tx) =>
      tx.insert(dingtalkUpload).values({
        id: randomUUID(),
        clientId: clientA,
        fileId: other,
        requestedBy: staff.id,
        status: 'uploaded',
      }),
    ),
  ).rejects.toThrow();
});
