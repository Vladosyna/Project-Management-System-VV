// commercial.portfolio.read — E13 overview (Vlad 26 Nov: "from the Commercial page drill into the project"): one row
// per site the actor may see, with confirmed PO and invoice totals in EUR, the latest DPIA status, the price-list
// price and the number of AI proposals waiting for a person. Proposals never count in the totals.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { sitesWithRecords } from '../repository.ts';

const cents = (eur: string | null) => (eur === null ? 0n : BigInt(eur.replace('.', '')));
const eurOf = (c: bigint) => {
  const s = c.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
};

export const portfolio = defineQuery({
  name: 'commercial.portfolio.read',
  permission: commercialPermissions.portfolio,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, records } = await sitesWithRecords(ctx.tx);
    return sites.map((s) => {
      const mine = records.filter((r) => r.siteId === s.id);
      const confirmed = mine.filter((r) => r.confirmedAt !== null);
      const sum = (kind: string, status?: string) =>
        eurOf(
          confirmed
            .filter((r) => r.kind === kind && (status === undefined || r.status === status))
            .reduce((a, r) => a + cents(r.eurAmount), 0n),
        );
      const dpia = confirmed
        .filter((r) => r.kind === 'dpia')
        .sort((a, b) => b.recordDate.localeCompare(a.recordDate))[0];
      const price = confirmed
        .filter((r) => r.kind === 'price_list')
        .sort((a, b) => b.recordDate.localeCompare(a.recordDate))[0];
      return {
        siteId: s.id,
        projectId: s.projectId,
        poCount: confirmed.filter((r) => r.kind === 'client_po').length,
        poEur: sum('client_po'),
        invoicedEur: sum('client_invoice'),
        paidEur: sum('client_invoice', 'paid'),
        dpia: dpia?.status ?? null,
        priceEur: price?.eurAmount ?? null,
        proposals: mine.length - confirmed.length,
      };
    });
  },
});
