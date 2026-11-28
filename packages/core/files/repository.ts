// files repository — the only place in this module that touches tables.
import { and, dingtalkUpload, eq, FILE_OWNER_TYPES, isNull, site, storedFile, type Tx } from '@ocs/db';

export { FILE_OWNER_TYPES };

export type FileRow = typeof storedFile.$inferSelect;

/** The active site and its client (RLS: staff only). */
export async function findActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

export async function lockActiveFile(tx: Tx, id: string): Promise<FileRow | undefined> {
  return (
    await tx
      .select()
      .from(storedFile)
      .where(and(eq(storedFile.id, id), isNull(storedFile.archivedAt)))
      .for('update')
  )[0];
}

export async function insertFile(tx: Tx, row: typeof storedFile.$inferInsert) {
  await tx.insert(storedFile).values(row);
}

export async function updateFile(tx: Tx, id: string, set: Partial<typeof storedFile.$inferInsert>) {
  await tx.update(storedFile).set(set).where(eq(storedFile.id, id));
}

export async function uploadOf(tx: Tx, fileId: string) {
  return (await tx.select().from(dingtalkUpload).where(eq(dingtalkUpload.fileId, fileId)))[0];
}

export async function insertUpload(tx: Tx, row: typeof dingtalkUpload.$inferInsert) {
  await tx.insert(dingtalkUpload).values(row);
}

export async function fileWithObjectKey(tx: Tx, objectKey: string) {
  return (
    await tx.select({ id: storedFile.id }).from(storedFile).where(eq(storedFile.objectKey, objectKey))
  )[0];
}
