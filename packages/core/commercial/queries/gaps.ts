// commercial.gaps.read — the hourly alert run (domain/rules.md, D-34 N2): every active site with its commercial gaps.
// R14 installed without a confirmed client PO; R24 installed without an approved DPIA; R26 no owner (no PM); R5
// accepted 5 working days ago or more without a confirmed client invoice (project country's calendar). Only
// confirmed records count: an AI proposal is not yet a fact. The system actor only.
import { z } from 'zod';
import { calendarIds, localDateIn, type CalendarId } from '../../calendar/index.ts';
import { defineQuery } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { commercialGaps, directorIds } from '../repository.ts';
import { invoiceOverdue } from '../rules/invoice-ready.ts';
import { invoiceReadyRule } from '../rules/invoice-ready.config.ts';

/** As work.alert.raise and the life cycle: a country without a working calendar yet counts like GB. */
const calendarOf = (country: string): CalendarId =>
  (calendarIds as readonly string[]).includes(country) ? (country as CalendarId) : 'GB';

export const gaps = defineQuery({
  name: 'commercial.gaps.read',
  permission: commercialPermissions.gaps,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, installed, acceptedOn, records } = await commercialGaps(
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
        calendar: calendarOf(s.countryCode),
      }),
    }));
    /** R26 has no PM to own it: the Delivery Directors get it. */
    return { sites: rows, directors: await directorIds(ctx.tx) };
  },
});
