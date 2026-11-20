// intake repository — the only place in this module that touches tables.
import { and, desc, eq, handoverCard, handoverItem, inArray, isNull, site, sql, type Tx } from '@ocs/db';

/** The active project, locked until the transaction ends. */
export async function lockActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
      .for('update')
  )[0];
}

/** The project's card in play: the draft or the submitted one (one at most, migration 0008). */
export async function openCard(tx: Tx, siteId: string) {
  return (
    await tx
      .select()
      .from(handoverCard)
      .where(
        and(
          eq(handoverCard.siteId, siteId),
          isNull(handoverCard.archivedAt),
          inArray(handoverCard.status, ['draft', 'submitted']),
        ),
      )
  )[0];
}

export async function lastVersion(tx: Tx, siteId: string) {
  const [row] = await tx
    .select({ version: handoverCard.version })
    .from(handoverCard)
    .where(eq(handoverCard.siteId, siteId))
    .orderBy(desc(handoverCard.version))
    .limit(1);
  return row?.version ?? 0;
}

/** SOP-DEL-01 §3: the site's folder was accepted in an earlier intake. */
export async function hasAcceptedCard(tx: Tx, siteId: string) {
  const rows = await tx
    .select({ id: handoverCard.id })
    .from(handoverCard)
    .where(
      and(
        eq(handoverCard.siteId, siteId),
        inArray(handoverCard.status, ['accepted', 'accepted_with_conditions']),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function insertCard(tx: Tx, row: typeof handoverCard.$inferInsert) {
  await tx.insert(handoverCard).values(row);
}

export async function updateCard(tx: Tx, id: string, set: Partial<typeof handoverCard.$inferInsert>) {
  await tx.update(handoverCard).set(set).where(eq(handoverCard.id, id));
}

export async function activeItems(tx: Tx, cardId: string) {
  return tx
    .select()
    .from(handoverItem)
    .where(and(eq(handoverItem.cardId, cardId), isNull(handoverItem.archivedAt)));
}

/**
 * The card's items become exactly `items`: each is written in place (one row per code, migration 0008), and
 * items left out are archived, never deleted.
 */
export async function replaceItems(
  tx: Tx,
  card: { id: string; clientId: string },
  items: readonly (typeof handoverItem.$inferInsert)[],
  now: Date,
) {
  if (items.length > 0) {
    await tx
      .insert(handoverItem)
      .values([...items])
      .onConflictDoUpdate({
        target: [handoverItem.cardId, handoverItem.code],
        set: {
          status: sql`excluded.status`,
          value: sql`excluded.value`,
          fileRef: sql`excluded.file_ref`,
          naReason: sql`excluded.na_reason`,
          archivedAt: null,
        },
      });
  }
  const keep = items.map((i) => i.code);
  await tx
    .update(handoverItem)
    .set({ archivedAt: now })
    .where(
      and(
        eq(handoverItem.cardId, card.id),
        isNull(handoverItem.archivedAt),
        keep.length > 0
          ? sql`${handoverItem.code} NOT IN (${sql.join(
              keep.map((k) => sql`${k}`),
              sql`, `,
            )})`
          : undefined,
      ),
    );
}
