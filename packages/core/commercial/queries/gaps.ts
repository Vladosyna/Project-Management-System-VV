// commercial.gaps.read — the hourly alert run (domain/rules.md, D-34 N2): every active site with its commercial gaps.
// R14 installed without a confirmed client PO; R24 installed without an approved DPIA; R26 no owner (no PM); R5
// accepted 5 working days ago or more without a confirmed client invoice (project country's calendar); R27 approved
// installer cost above the client price (EUR); R13 in more than one open client PO. Only confirmed records count: an
// AI proposal is not yet a fact. The system actor only.
import { z } from 'zod';
import { calendarOfCountry, localDateIn } from '../../calendar/index.ts';
import { defineQuery } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { commercialGaps, directorIds } from '../repository.ts';
import { invoiceOverdue } from '../rules/invoice-ready.ts';
import { invoiceReadyRule } from '../rules/invoice-ready.config.ts';
import { negativeMargin } from '../rules/negative-margin.ts';
import { inTwoPos } from '../rules/site-in-two-pos.ts';

/** D-45 (1): the record kinds that may cover a batch of stores. */
const BATCH_KINDS = new Set(['client_po', 'client_invoice']);

export const gaps = defineQuery({
  name: 'commercial.gaps.read',
  permission: commercialPermissions.gaps,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, installed, acceptedOn, records, links, approvedCosts } = await commercialGaps(
      ctx.tx,
      invoiceReadyRule.afterStep,
    );
    /**
     * D-45 (1): a client PO or client invoice also covers the stores linked to it (a batch), for R13, R14 and R5. A DPIA
     * is never spread through links: it is per store or, for clients that agree it per country, per country (D-45 (3)).
     * R27 keeps the store's own records: a batch amount is for all its stores, not one.
     */
    const covering = [
      ...records,
      ...links.flatMap((l) =>
        records
          .filter((r) => r.id === l.recordId && BATCH_KINDS.has(r.kind))
          .map((r) => ({ ...r, siteId: l.siteId })),
      ),
    ];
    const has = (siteId: string, kind: string, status?: string) =>
      covering.some(
        (r) => r.siteId === siteId && r.kind === kind && (status === undefined || r.status === status),
      );
    const today = localDateIn(ctx.now, 'UTC');
    const rows = sites.map((s) => ({
      siteId: s.id,
      projectId: s.projectId,
      r14: installed.has(s.id) && !has(s.id, 'client_po'),
      r24: installed.has(s.id) && !has(s.id, 'dpia', 'approved'),
      r26: s.pmId === null,
      r5: invoiceOverdue({
        acceptedOn: acceptedOn.get(s.id) ?? null,
        today,
        hasInvoice: has(s.id, invoiceReadyRule.clearedBy),
        calendar: calendarOfCountry(s.countryCode),
      }),
      r13: inTwoPos(covering.filter((r) => r.siteId === s.id)),
      r27: negativeMargin({
        approvedCostsEur: approvedCosts.filter((c) => c.siteId === s.id).map((c) => c.eurAmount),
        clientPrices: records.filter((r) => r.siteId === s.id),
      }),
    }));
    /** R26 has no PM to own it: the Delivery Directors get it. */
    return { sites: rows, directors: await directorIds(ctx.tx) };
  },
});
