// org repository — the only place in this module that touches tables.
import { and, asc, client, eq, isNull, site, sql, type Tx } from '@ocs/db';

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
