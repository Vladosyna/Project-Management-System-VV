// intake repository — the only place in this module that touches tables.
import {
  and,
  desc,
  conditionalStart,
  eq,
  handoverCard,
  handoverItem,
  intakeCondition,
  intakeDecision,
  inArray,
  isNotNull,
  isNull,
  site,
  userRole,
  sql,
  type Tx,
} from '@ocs/db';

/** The active project, locked until the transaction ends. */
export async function lockActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: site.id, clientId: site.clientId, countryCode: site.countryCode })
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

/** Every card version of the project, for the next version number and §3 "folder already accepted". */
export async function cardHistory(tx: Tx, siteId: string) {
  return tx
    .select({ version: handoverCard.version, status: handoverCard.status })
    .from(handoverCard)
    .where(eq(handoverCard.siteId, siteId));
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

/** SOP-DEL-01 §9: the active Conditional Start of a card version, if any. */
export async function activeConditionalStart(tx: Tx, cardId: string) {
  return (
    await tx
      .select({ id: conditionalStart.id })
      .from(conditionalStart)
      .where(and(eq(conditionalStart.cardId, cardId), isNull(conditionalStart.archivedAt)))
  )[0];
}

export async function insertConditionalStart(tx: Tx, row: typeof conditionalStart.$inferInsert) {
  await tx.insert(conditionalStart).values(row);
}

/** SOP-DEL-01 §8: the decision on one card version and its conditions. */
export async function insertDecision(
  tx: Tx,
  row: typeof intakeDecision.$inferInsert,
  conditions: readonly (typeof intakeCondition.$inferInsert)[],
) {
  await tx.insert(intakeDecision).values(row);
  if (conditions.length > 0) await tx.insert(intakeCondition).values([...conditions]);
}

/** SOP-DEL-01 §12 Intake Register: every submitted card version with its project and decision. */
export async function submissions(tx: Tx) {
  return tx
    .select({
      siteId: site.id,
      projectId: site.projectId,
      countryCode: site.countryCode,
      version: handoverCard.version,
      submittedAt: handoverCard.submittedAt,
      decision: intakeDecision.decision,
      decidedAt: intakeDecision.decidedAt,
    })
    .from(handoverCard)
    .innerJoin(site, eq(site.id, handoverCard.siteId))
    .leftJoin(intakeDecision, eq(intakeDecision.cardId, handoverCard.id))
    .where(and(isNotNull(handoverCard.submittedAt), isNull(handoverCard.archivedAt)))
    .orderBy(site.projectId, handoverCard.version);
}

/** E2 AC3: open conditions whose deadline has passed, locked, with what the alert needs. */
export async function lockOverdueConditions(tx: Tx, today: string) {
  return tx
    .select({
      id: intakeCondition.id,
      itemCode: intakeCondition.itemCode,
      deadline: intakeCondition.deadline,
      siteId: site.id,
      projectId: site.projectId,
      content: handoverCard.content,
    })
    .from(intakeCondition)
    .innerJoin(intakeDecision, eq(intakeDecision.id, intakeCondition.decisionId))
    .innerJoin(handoverCard, eq(handoverCard.id, intakeDecision.cardId))
    .innerJoin(site, eq(site.id, handoverCard.siteId))
    .where(
      and(
        eq(intakeCondition.status, 'open'),
        isNull(intakeCondition.archivedAt),
        sql`${intakeCondition.deadline} < ${today}`,
      ),
    )
    .for('update', { of: intakeCondition });
}

export async function expireConditions(tx: Tx, ids: readonly string[]) {
  if (ids.length > 0) {
    await tx
      .update(intakeCondition)
      .set({ status: 'expired' })
      .where(inArray(intakeCondition.id, [...ids]));
  }
}

/** Holders of the Delivery Director role (SOP-DEL-01 §4). */
export async function directorIds(tx: Tx) {
  const rows = await tx
    .select({ userId: userRole.userId })
    .from(userRole)
    .where(and(eq(userRole.role, 'director'), isNull(userRole.revokedAt)));
  return [...new Set(rows.map((r) => r.userId))].sort();
}

/** The project's latest card version (any status), for the card screen. */
export async function latestCard(tx: Tx, siteId: string) {
  return (
    await tx
      .select()
      .from(handoverCard)
      .where(and(eq(handoverCard.siteId, siteId), isNull(handoverCard.archivedAt)))
      .orderBy(desc(handoverCard.version))
      .limit(1)
  )[0];
}

export async function decisionOf(tx: Tx, cardId: string) {
  const [decision] = await tx.select().from(intakeDecision).where(eq(intakeDecision.cardId, cardId));
  if (!decision) return null;
  const conditions = await tx
    .select({
      itemCode: intakeCondition.itemCode,
      text: intakeCondition.text,
      deadline: intakeCondition.deadline,
      status: intakeCondition.status,
    })
    .from(intakeCondition)
    .where(and(eq(intakeCondition.decisionId, decision.id), isNull(intakeCondition.archivedAt)))
    .orderBy(intakeCondition.itemCode);
  return { ...decision, conditions };
}

export async function conditionalStartOf(tx: Tx, cardId: string) {
  return (
    await tx
      .select({
        missingItems: conditionalStart.missingItems,
        deadline: conditionalStart.deadline,
        writtenRef: conditionalStart.writtenRef,
      })
      .from(conditionalStart)
      .where(and(eq(conditionalStart.cardId, cardId), isNull(conditionalStart.archivedAt)))
  )[0];
}
