// work repository — the only place in this module that touches tables.
import {
  action,
  and,
  asc,
  authUser,
  comment,
  desc,
  eq,
  inArray,
  isNull,
  site,
  sql,
  visit,
  type Tx,
} from '@ocs/db';

export type ActionRow = typeof action.$inferSelect;
export type CommentRow = typeof comment.$inferSelect;

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

/** Open and in-progress actions the actor may see, earliest due first, with Project ID and owner name. */
export async function listOpenActions(
  tx: Tx,
  filter: { siteId?: string | undefined; ownerId?: string | undefined },
) {
  return tx
    .select({ action, projectId: site.projectId, ownerUserName: authUser.name })
    .from(action)
    .leftJoin(site, eq(site.id, action.siteId))
    .leftJoin(authUser, eq(authUser.id, action.ownerId))
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

/** Which of these users are active staff — the only people a mention may notify (E5 AC2). */
export async function activeStaffAmong(tx: Tx, ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await tx
    .select({ id: authUser.id })
    .from(authUser)
    .where(and(inArray(authUser.id, [...ids]), eq(authUser.kind, 'staff'), isNull(authUser.archivedAt)));
  return new Set(rows.map((r) => r.id));
}

export async function insertComment(tx: Tx, row: typeof comment.$inferInsert): Promise<void> {
  await tx.insert(comment).values(row);
}

export async function findActiveComment(tx: Tx, id: string): Promise<CommentRow | undefined> {
  return (
    await tx
      .select()
      .from(comment)
      .where(and(eq(comment.id, id), isNull(comment.archivedAt)))
  )[0];
}

export async function insertVisit(tx: Tx, row: typeof visit.$inferInsert): Promise<void> {
  await tx.insert(visit).values(row);
}

export async function insertActions(tx: Tx, rows: (typeof action.$inferInsert)[]): Promise<void> {
  if (rows.length > 0) await tx.insert(action).values(rows);
}

/** The newest `limit` of each kind on a project, before `before` (paging) — merged by the feed query. */
export async function projectFeedRows(tx: Tx, siteId: string, before: Date, limit: number) {
  const actions = await tx
    .select()
    .from(action)
    .where(and(eq(action.siteId, siteId), isNull(action.archivedAt), sql`${action.createdAt} < ${before}`))
    .orderBy(desc(action.createdAt))
    .limit(limit);
  const comments = await tx
    .select()
    .from(comment)
    .where(and(eq(comment.siteId, siteId), isNull(comment.archivedAt), sql`${comment.createdAt} < ${before}`))
    .orderBy(desc(comment.createdAt))
    .limit(limit);
  const visits = await tx
    .select()
    .from(visit)
    .where(and(eq(visit.siteId, siteId), isNull(visit.archivedAt), sql`${visit.recordedAt} < ${before}`))
    .orderBy(desc(visit.recordedAt))
    .limit(limit);
  return { actions, comments, visits };
}

/** Active staff accounts by name — who may be @mentioned or own an action (E5 AC2). */
export async function listActiveStaff(tx: Tx): Promise<{ id: string; name: string }[]> {
  return tx
    .select({ id: authUser.id, name: authUser.name })
    .from(authUser)
    .where(and(eq(authUser.kind, 'staff'), isNull(authUser.archivedAt)))
    .orderBy(asc(authUser.name));
}

/** The project's PM, who owns the alerts raised on it (R15). */
export async function findSitePm(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId, pmId: site.pmId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

/**
 * The action already raised for this alert, if any (open or done). Serialised per alert ref for the rest of the
 * transaction, so two runs of the alert job cannot both create it.
 */
export async function lockAlertAction(tx: Tx, alertRef: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${alertRef}))`);
  return (
    await tx
      .select({ id: action.id })
      .from(action)
      .where(and(eq(action.sourceKind, 'alert'), eq(action.sourceRef, alertRef), isNull(action.archivedAt)))
  )[0];
}
