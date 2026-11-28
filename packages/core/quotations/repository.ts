// quotations repository — the only place in this module that touches tables.
import {
  and,
  clientQuotation,
  clientQuotationSite,
  clientQuoteConfig,
  device,
  eq,
  inArray,
  isNull,
  sensorPrice,
  site,
  sql,
  type Tx,
} from '@ocs/db';

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
/** The active sites among ids, with client and country, to check they belong to the quotation's client and country. */
export async function sitesOf(tx: Tx, ids: readonly string[]) {
  return tx
    .select({ id: site.id, clientId: site.clientId, countryCode: site.countryCode })
    .from(site)
    .where(and(inArray(site.id, [...ids]), isNull(site.archivedAt)));
}
/** Quotations already numbered with this prefix (for the running number of the day). */
export async function countNumbered(tx: Tx, prefix: string) {
  const rows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(clientQuotation)
    .where(sql`${clientQuotation.number} LIKE ${`${prefix}%`}`);
  return rows[0]?.n ?? 0;
}
export async function insertQuotation(
  tx: Tx,
  row: typeof clientQuotation.$inferInsert,
  stores: (typeof clientQuotationSite.$inferInsert)[],
) {
  await tx.insert(clientQuotation).values(row);
  if (stores.length > 0) await tx.insert(clientQuotationSite).values(stores);
}
/** D-42: the active devices registered on these projects, counted by site and model. */
export async function devicesOfSites(tx: Tx, siteIds: readonly string[]) {
  return tx
    .select({ siteId: device.siteId, model: device.model, count: sql<number>`count(*)::int` })
    .from(device)
    .where(and(inArray(device.siteId, [...siteIds]), isNull(device.archivedAt)))
    .groupBy(device.siteId, device.model);
}
/** Active net prices of these models for the client in one currency. */
export async function pricesOf(tx: Tx, clientId: string, models: readonly string[], currency: string) {
  return tx
    .select({ model: sensorPrice.model, unitPrice: sensorPrice.unitPrice })
    .from(sensorPrice)
    .where(
      and(
        eq(sensorPrice.clientId, clientId),
        inArray(sensorPrice.model, [...models]),
        eq(sensorPrice.currency, currency),
        isNull(sensorPrice.archivedAt),
      ),
    );
}
