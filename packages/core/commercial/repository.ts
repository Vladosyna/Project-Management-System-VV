// commercial repository — the only place in this module that touches tables.
import { and, asc, commercialRecord, eq, isNull, site, siteStep, sql, userRole, type Tx } from '@ocs/db';

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

/** R14/R24/R26: active sites with their owner, whether installation is recorded, and confirmed PO / approved DPIA. */
export async function commercialGaps(tx: Tx) {
  const sites = await tx
    .select({ id: site.id, projectId: site.projectId, pmId: site.pmId })
    .from(site)
    .where(isNull(site.archivedAt));
  const installed = await tx
    .select({ siteId: siteStep.siteId })
    .from(siteStep)
    .where(and(eq(siteStep.step, 'installed'), isNull(siteStep.archivedAt)));
  const records = await tx
    .select({ siteId: commercialRecord.siteId, kind: commercialRecord.kind, status: commercialRecord.status })
    .from(commercialRecord)
    .where(and(isNull(commercialRecord.archivedAt), sql`${commercialRecord.confirmedAt} IS NOT NULL`));
  return { sites, installed: new Set(installed.map((r) => r.siteId)), records };
}

/** R26: a site without an owner goes to the Delivery Directors. */
export async function directorIds(tx: Tx) {
  const rows = await tx
    .select({ userId: userRole.userId })
    .from(userRole)
    .where(and(eq(userRole.role, 'director'), isNull(userRole.revokedAt)));
  return [...new Set(rows.map((r) => r.userId))].sort();
}
