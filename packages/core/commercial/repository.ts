// commercial repository — the only place in this module that touches tables.
import {
  and,
  asc,
  commercialRecord,
  commercialRecordSite,
  eq,
  installerJob,
  isNull,
  priceProposal,
  quoteApproval,
  site,
  siteStep,
  sql,
  userRole,
  type Tx,
} from '@ocs/db';

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

/**
 * R5/R14/R24/R26/R27: active sites with their owner and country, whether installation is recorded, when acceptance
 * was recorded, their confirmed records (PO, DPIA, invoice, price list, with the EUR amount), the further stores a
 * batch record covers (D-44) and the EUR amount of each CEO-approved installer quote on an active job that is not
 * cancelled.
 */
export async function commercialGaps(tx: Tx, acceptedStep: string) {
  const sites = await tx
    .select({ id: site.id, projectId: site.projectId, pmId: site.pmId, countryCode: site.countryCode })
    .from(site)
    .where(isNull(site.archivedAt));
  const installed = await tx
    .select({ siteId: siteStep.siteId })
    .from(siteStep)
    .where(and(eq(siteStep.step, 'installed'), isNull(siteStep.archivedAt)));
  const accepted = await tx
    .select({ siteId: siteStep.siteId, doneOn: siteStep.doneOn })
    .from(siteStep)
    .where(and(eq(siteStep.step, acceptedStep), isNull(siteStep.archivedAt)));
  const records = await tx
    .select({
      id: commercialRecord.id,
      siteId: commercialRecord.siteId,
      kind: commercialRecord.kind,
      status: commercialRecord.status,
      eurAmount: commercialRecord.eurAmount,
    })
    .from(commercialRecord)
    .where(and(isNull(commercialRecord.archivedAt), sql`${commercialRecord.confirmedAt} IS NOT NULL`));
  const approvedCosts = await tx
    .select({ siteId: installerJob.siteId, eurAmount: priceProposal.eurAmount })
    .from(quoteApproval)
    .innerJoin(priceProposal, eq(priceProposal.id, quoteApproval.proposalId))
    .innerJoin(installerJob, eq(installerJob.id, quoteApproval.jobId))
    .where(
      and(
        isNull(quoteApproval.archivedAt),
        isNull(installerJob.archivedAt),
        sql`${installerJob.status} <> 'cancelled'`,
      ),
    );
  /** D-44: further stores a record (a batch PO) covers, besides the store it was entered on. */
  const links = await tx
    .select({ recordId: commercialRecordSite.recordId, siteId: commercialRecordSite.siteId })
    .from(commercialRecordSite)
    .where(isNull(commercialRecordSite.archivedAt));
  return {
    sites,
    installed: new Set(installed.map((r) => r.siteId)),
    acceptedOn: new Map(accepted.map((r) => [r.siteId, r.doneOn])),
    records,
    links,
    approvedCosts,
  };
}

/** R26: a site without an owner goes to the Delivery Directors. */
export async function directorIds(tx: Tx) {
  const rows = await tx
    .select({ userId: userRole.userId })
    .from(userRole)
    .where(and(eq(userRole.role, 'director'), isNull(userRole.revokedAt)));
  return [...new Set(rows.map((r) => r.userId))].sort();
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
