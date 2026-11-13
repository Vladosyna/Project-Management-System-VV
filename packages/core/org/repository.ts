// org repository — the only place in this module that touches tables.
import {
  and,
  asc,
  client,
  eq,
  isNull,
  partner,
  partnerAssignment,
  programme,
  site,
  sql,
  type Tx,
} from '@ocs/db';

export type ClientRow = typeof client.$inferSelect;
export type SiteRow = typeof site.$inferSelect;

export async function insertClient(tx: Tx, row: typeof client.$inferInsert): Promise<void> {
  await tx.insert(client).values(row);
}

/** Any client with this short code, archived ones included — a short code is never reused. */
export async function findClientByShortCode(tx: Tx, shortCode: string): Promise<ClientRow | undefined> {
  return (await tx.select().from(client).where(eq(client.shortCode, shortCode)))[0];
}

/** Active clients the actor may see (RLS), by short code. */
export async function listActiveClients(tx: Tx): Promise<ClientRow[]> {
  return tx.select().from(client).where(isNull(client.archivedAt)).orderBy(asc(client.shortCode));
}

/** The active client, locked until the transaction ends so its sites are numbered one at a time. */
export async function lockActiveClient(tx: Tx, id: string): Promise<ClientRow | undefined> {
  return (
    await tx
      .select()
      .from(client)
      .where(and(eq(client.id, id), isNull(client.archivedAt)))
      .for('update')
  )[0];
}

/** Highest running number used for this client and city, archived sites included (never reused). */
export async function maxRunningNo(tx: Tx, clientId: string, cityCode: string): Promise<number> {
  const rows = await tx
    .select({ max: sql<number | null>`max(${site.runningNo})` })
    .from(site)
    .where(and(eq(site.clientId, clientId), eq(site.cityCode, cityCode)));
  return rows[0]?.max ?? 0;
}

export async function insertSite(tx: Tx, row: typeof site.$inferInsert): Promise<void> {
  await tx.insert(site).values(row);
}

/** Active sites the actor may see (RLS), by Project ID; optionally one client's. */
export async function listActiveSites(tx: Tx, clientId?: string): Promise<SiteRow[]> {
  const active = isNull(site.archivedAt);
  return tx
    .select()
    .from(site)
    .where(clientId ? and(active, eq(site.clientId, clientId)) : active)
    .orderBy(asc(site.projectId));
}

/** The active site, locked until the transaction ends. */
export async function lockActiveSite(tx: Tx, id: string): Promise<SiteRow | undefined> {
  return (
    await tx
      .select()
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
      .for('update')
  )[0];
}

export async function setSiteStandard(tx: Tx, id: string, standard: SiteRow['standard']): Promise<void> {
  await tx.update(site).set({ standard }).where(eq(site.id, id));
}

export async function findProgrammeByName(tx: Tx, clientId: string, name: string) {
  return (
    await tx
      .select({ id: programme.id })
      .from(programme)
      .where(and(eq(programme.clientId, clientId), eq(programme.name, name)))
  )[0];
}

/** The active programme if it belongs to this client. */
export async function findActiveProgrammeOf(tx: Tx, clientId: string, id: string) {
  return (
    await tx
      .select({ id: programme.id })
      .from(programme)
      .where(and(eq(programme.id, id), eq(programme.clientId, clientId), isNull(programme.archivedAt)))
  )[0];
}

export async function insertProgramme(tx: Tx, row: typeof programme.$inferInsert): Promise<void> {
  await tx.insert(programme).values(row);
}

export async function insertPartner(tx: Tx, row: typeof partner.$inferInsert): Promise<void> {
  await tx.insert(partner).values(row);
}

export async function findActivePartner(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: partner.id })
      .from(partner)
      .where(and(eq(partner.id, id), isNull(partner.archivedAt)))
  )[0];
}

/** Every assignment of the client, archived ones included (letters are never reused). */
export async function clientAssignments(tx: Tx, clientId: string) {
  return tx
    .select({ partnerId: partnerAssignment.partnerId, letter: partnerAssignment.letter })
    .from(partnerAssignment)
    .where(eq(partnerAssignment.clientId, clientId));
}

export async function insertAssignment(tx: Tx, row: typeof partnerAssignment.$inferInsert): Promise<void> {
  await tx.insert(partnerAssignment).values(row);
}

/** Client-facing: letters only. Deliberately never joins `partner`, so no real name can come back. */
export async function activeLetters(tx: Tx, clientId: string) {
  return tx
    .select({ letter: partnerAssignment.letter })
    .from(partnerAssignment)
    .where(and(eq(partnerAssignment.clientId, clientId), isNull(partnerAssignment.archivedAt)))
    .orderBy(asc(partnerAssignment.letter));
}

/** Staff-only: partners with real names and their active client letters. */
export async function partnersWithLetters(tx: Tx) {
  return tx
    .select({
      id: partner.id,
      realName: partner.realName,
      countryCode: partner.countryCode,
      clientId: partnerAssignment.clientId,
      letter: partnerAssignment.letter,
    })
    .from(partner)
    .leftJoin(
      partnerAssignment,
      and(eq(partnerAssignment.partnerId, partner.id), isNull(partnerAssignment.archivedAt)),
    )
    .where(isNull(partner.archivedAt))
    .orderBy(asc(partner.realName), asc(partnerAssignment.letter));
}

/** E4: the mall on the device platform and the offline alerts checkbox. */
export async function setSiteDevicePlatform(
  tx: Tx,
  id: string,
  values: { platformRef: string | null; deviceAlertsEnabled: boolean },
): Promise<void> {
  await tx.update(site).set(values).where(eq(site.id, id));
}

/** The other active project already linked to this mall, if any. */
export async function siteLinkedTo(tx: Tx, platformRef: string, exceptId: string) {
  return (
    await tx
      .select({ projectId: site.projectId })
      .from(site)
      .where(and(eq(site.platformRef, platformRef), isNull(site.archivedAt), sql`${site.id} <> ${exceptId}`))
  )[0];
}
