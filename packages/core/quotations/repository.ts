// quotations repository — the only place in this module that touches tables.
import { and, clientQuoteConfig, eq, isNull, sensorPrice, type Tx } from '@ocs/db';

export async function archiveActiveConfig(tx: Tx, clientId: string, countryCode: string, at: Date) {
  await tx
    .update(clientQuoteConfig)
    .set({ archivedAt: at })
    .where(
      and(
        eq(clientQuoteConfig.clientId, clientId),
        eq(clientQuoteConfig.countryCode, countryCode),
        isNull(clientQuoteConfig.archivedAt),
      ),
    );
}
export async function insertConfig(tx: Tx, row: typeof clientQuoteConfig.$inferInsert) {
  await tx.insert(clientQuoteConfig).values(row);
}
export async function activeConfig(tx: Tx, clientId: string, countryCode: string) {
  return (
    await tx
      .select()
      .from(clientQuoteConfig)
      .where(
        and(
          eq(clientQuoteConfig.clientId, clientId),
          eq(clientQuoteConfig.countryCode, countryCode),
          isNull(clientQuoteConfig.archivedAt),
        ),
      )
  )[0];
}
export async function archiveActivePrice(
  tx: Tx,
  clientId: string,
  model: string,
  currency: string,
  at: Date,
) {
  await tx
    .update(sensorPrice)
    .set({ archivedAt: at })
    .where(
      and(
        eq(sensorPrice.clientId, clientId),
        eq(sensorPrice.model, model),
        eq(sensorPrice.currency, currency),
        isNull(sensorPrice.archivedAt),
      ),
    );
}
export async function insertPrice(tx: Tx, row: typeof sensorPrice.$inferInsert) {
  await tx.insert(sensorPrice).values(row);
}
export async function activePrice(tx: Tx, clientId: string, model: string, currency: string) {
  return (
    await tx
      .select()
      .from(sensorPrice)
      .where(
        and(
          eq(sensorPrice.clientId, clientId),
          eq(sensorPrice.model, model),
          eq(sensorPrice.currency, currency),
          isNull(sensorPrice.archivedAt),
        ),
      )
  )[0];
}
