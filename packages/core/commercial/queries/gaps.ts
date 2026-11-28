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

export const gaps = defineQuery({
  name: 'commercial.gaps.read',
  permission: commercialPermissions.gaps,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, installed, acceptedOn, records, approvedCosts } = await commercialGaps(
      ctx.tx,
      invoiceReadyRule.afterStep,
    );
    const has = (siteId: string, kind: string, status?: string) =>
      records.some(
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
      r13: inTwoPos(records.filter((r) => r.siteId === s.id)),
      r27: negativeMargin({
        approvedCostsEur: approvedCosts.filter((c) => c.siteId === s.id).map((c) => c.eurAmount),
        clientPrices: records.filter((r) => r.siteId === s.id),
      }),
    }));
    /** R26 has no PM to own it: the Delivery Directors get it. */
    return { sites: rows, directors: await directorIds(ctx.tx) };
  },
});
