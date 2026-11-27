// installers repository — the only place in this module that touches tables.
import {
  and,
  asc,
  eq,
  installerJob,
  isNull,
  partner,
  priceProposal,
  quoteApproval,
  site,
  sql,
  type Tx,
} from '@ocs/db';

export async function findActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

export async function activePartner(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: partner.id })
      .from(partner)
      .where(and(eq(partner.id, id), isNull(partner.archivedAt)))
  )[0];
}

export async function insertJob(tx: Tx, row: typeof installerJob.$inferInsert) {
  await tx.insert(installerJob).values(row);
}

export async function activeJob(tx: Tx, id: string) {
  return (
    await tx
      .select()
      .from(installerJob)
      .where(and(eq(installerJob.id, id), isNull(installerJob.archivedAt)))
  )[0];
}

export async function insertQuote(tx: Tx, row: typeof priceProposal.$inferInsert) {
  await tx.insert(priceProposal).values(row);
}

export async function lockActiveQuote(tx: Tx, id: string) {
  return (
    await tx
      .select()
      .from(priceProposal)
      .where(and(eq(priceProposal.id, id), isNull(priceProposal.archivedAt)))
      .for('update')
  )[0];
}

export async function confirmQuoteRow(tx: Tx, id: string, by: string, at: Date) {
  await tx.update(priceProposal).set({ confirmedBy: by, confirmedAt: at }).where(eq(priceProposal.id, id));
}

/** A site's active jobs and their active quotes, with the installer's internal name (staff only, RLS). */
export async function jobsOfSite(tx: Tx, siteId: string) {
  const jobs = await tx
    .select({ job: installerJob, installer: partner.realName })
    .from(installerJob)
    .leftJoin(partner, eq(partner.id, installerJob.partnerId))
    .where(and(eq(installerJob.siteId, siteId), isNull(installerJob.archivedAt)))
    .orderBy(asc(installerJob.createdAt));
  const quotes = await tx
    .select({ quote: priceProposal, installer: partner.realName })
    .from(priceProposal)
    .innerJoin(installerJob, eq(installerJob.id, priceProposal.jobId))
    .innerJoin(partner, eq(partner.id, priceProposal.partnerId))
    .where(and(eq(installerJob.siteId, siteId), isNull(priceProposal.archivedAt)))
    .orderBy(asc(priceProposal.eurAmount));
  return { jobs, quotes };
}

export async function lockActiveJob(tx: Tx, id: string) {
  return (
    await tx
      .select()
      .from(installerJob)
      .where(and(eq(installerJob.id, id), isNull(installerJob.archivedAt)))
      .for('update')
  )[0];
}

export async function updateJob(tx: Tx, id: string, set: Partial<typeof installerJob.$inferInsert>) {
  await tx.update(installerJob).set(set).where(eq(installerJob.id, id));
}

/** Confirmed active quotes of a job, for P-12 "at least two comparable quotes on the same SOW". */
export async function confirmedQuotesOfJob(tx: Tx, jobId: string) {
  return tx
    .select({
      id: priceProposal.id,
      partnerId: priceProposal.partnerId,
      sowVersion: priceProposal.sowVersion,
    })
    .from(priceProposal)
    .where(
      and(
        eq(priceProposal.jobId, jobId),
        isNull(priceProposal.archivedAt),
        sql`${priceProposal.confirmedAt} IS NOT NULL`,
      ),
    );
}

export async function activeApproval(tx: Tx, jobId: string) {
  return (
    await tx
      .select({ id: quoteApproval.id })
      .from(quoteApproval)
      .where(and(eq(quoteApproval.jobId, jobId), isNull(quoteApproval.archivedAt)))
  )[0];
}

export async function insertApproval(tx: Tx, row: typeof quoteApproval.$inferInsert) {
  await tx.insert(quoteApproval).values(row);
}

/** Active installer companies, by name (staff only, RLS). */
export async function activePartners(tx: Tx) {
  return tx
    .select({ id: partner.id, name: partner.realName, countryCode: partner.countryCode })
    .from(partner)
    .where(isNull(partner.archivedAt))
    .orderBy(asc(partner.realName));
}
