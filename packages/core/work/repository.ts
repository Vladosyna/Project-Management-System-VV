// work repository — the only place in this module that touches tables.
import { action, and, asc, eq, inArray, isNull, site, type Tx } from '@ocs/db';

export type ActionRow = typeof action.$inferSelect;

/** The project an action links to: active, visible to the actor (RLS). Read only — sites belong to org. */
export async function findActiveSite(
  tx: Tx,
  id: string,
): Promise<{ id: string; clientId: string } | undefined> {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

export async function insertAction(tx: Tx, row: typeof action.$inferInsert): Promise<void> {
  await tx.insert(action).values(row);
}

/** The active action, locked until the transaction ends. */
export async function lockActiveAction(tx: Tx, id: string): Promise<ActionRow | undefined> {
  return (
    await tx
      .select()
      .from(action)
      .where(and(eq(action.id, id), isNull(action.archivedAt)))
      .for('update')
  )[0];
}

export async function markActionDone(tx: Tx, id: string, at: Date): Promise<void> {
  await tx.update(action).set({ status: 'done', doneAt: at }).where(eq(action.id, id));
}

/** Open and in-progress actions the actor may see, earliest due first. */
export async function listOpenActions(
  tx: Tx,
  filter: { siteId?: string | undefined; ownerId?: string | undefined },
): Promise<ActionRow[]> {
  return tx
    .select()
    .from(action)
    .where(
      and(
        inArray(action.status, ['open', 'in_progress']),
        isNull(action.archivedAt),
        filter.siteId ? eq(action.siteId, filter.siteId) : undefined,
        filter.ownerId ? eq(action.ownerId, filter.ownerId) : undefined,
      ),
    )
    .orderBy(asc(action.due), asc(action.createdAt));
}
