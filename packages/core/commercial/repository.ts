// commercial repository — the only place in this module that touches tables.
import { and, asc, commercialRecord, eq, isNull, site, type Tx } from '@ocs/db';

export type CommercialRow = typeof commercialRecord.$inferSelect;

/** The active site the record belongs to (RLS: staff only). */
export async function findActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

export async function insertRecord(tx: Tx, row: typeof commercialRecord.$inferInsert) {
  await tx.insert(commercialRecord).values(row);
}

export async function lockActiveRecord(tx: Tx, id: string): Promise<CommercialRow | undefined> {
  return (
    await tx
      .select()
      .from(commercialRecord)
      .where(and(eq(commercialRecord.id, id), isNull(commercialRecord.archivedAt)))
      .for('update')
  )[0];
}

export async function updateRecord(tx: Tx, id: string, set: Partial<typeof commercialRecord.$inferInsert>) {
  await tx.update(commercialRecord).set(set).where(eq(commercialRecord.id, id));
}

export async function activeRecordsOfSite(tx: Tx, siteId: string): Promise<CommercialRow[]> {
  return tx
    .select()
    .from(commercialRecord)
    .where(and(eq(commercialRecord.siteId, siteId), isNull(commercialRecord.archivedAt)))
    .orderBy(asc(commercialRecord.kind), asc(commercialRecord.recordDate));
}

/** Every active site the actor may see (RLS) with its active commercial records, for the overview. */
export async function sitesWithRecords(tx: Tx) {
  const sites = await tx
    .select({ id: site.id, projectId: site.projectId })
    .from(site)
    .where(isNull(site.archivedAt))
    .orderBy(asc(site.projectId));
  const records = await tx.select().from(commercialRecord).where(isNull(commercialRecord.archivedAt));
  return { sites, records };
}
