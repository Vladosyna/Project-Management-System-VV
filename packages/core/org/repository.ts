// org repository — the only place in this module that touches tables.
import { asc, client, eq, isNull, type Tx } from '@ocs/db';

export type ClientRow = typeof client.$inferSelect;

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
