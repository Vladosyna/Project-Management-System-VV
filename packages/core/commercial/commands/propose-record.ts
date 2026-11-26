// commercial.record.propose — E13 AC1 (D-34 N2): a client PO, DPIA status, client invoice or price-list price on a
// site. Money is kept in the original currency and in EUR with the rate used (Vlad 23 Nov). Entered by a person it
// is confirmed by that person at once; from an AI agent (actor.via) it stays a proposal until a person confirms it
// (08-ai-and-mcp: money data is never applied unconfirmed).
import { z } from 'zod';
import { defineCommand, NotFound, ValidationFailed } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { findActiveSite, insertRecord } from '../repository.ts';
import { isAmount, isRate, toEur } from '../rules/money.ts';

const money = z.object({
  amount: z.string().refine(isAmount, 'amount: up to 12 digits and 2 decimals'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 code, e.g. EUR, GBP, PLN'),
  /** EUR per 1 unit of the currency; ignored (1) for EUR. */
  fxRate: z.string().refine(isRate, 'rate: positive, up to 6 decimals').optional(),
  fxDate: z.iso.date().optional(),
  fxSource: z.enum(['manual', 'agent', 'ecb']).optional(),
});
const NEEDS = {
  client_po: { reference: true, status: ['received'], money: 'optional' },
  dpia: { reference: false, status: ['pending', 'approved', 'rejected'], money: 'never' },
  client_invoice: { reference: true, status: ['issued', 'paid'], money: 'optional' },
  price_list: { reference: false, status: ['received'], money: 'required' },
} as const;

export const proposeRecord = defineCommand({
  name: 'commercial.record.propose',
  permission: commercialPermissions.proposeRecord,
  // One object (not a union): every tool input is an object JSON Schema for AI platforms (D-33).
  input: z
    .object({
      siteId: z.uuid(),
      kind: z.enum(['client_po', 'dpia', 'client_invoice', 'price_list']),
      /** PO or invoice number (client_po, client_invoice). */
      reference: z.string().trim().min(1).max(100).optional(),
      /** dpia: pending | approved | rejected; client_invoice: issued | paid; others: received (default). */
      status: z.enum(['received', 'pending', 'approved', 'rejected', 'issued', 'paid']).default('received'),
      recordDate: z.iso.date(),
      money: money.optional(),
      sourceRef: z.string().trim().min(1).max(500).optional(),
    })
    .superRefine((i, ctx) => {
      const need = NEEDS[i.kind];
      if (need.reference && !i.reference)
        ctx.addIssue({ code: 'custom', path: ['reference'], message: 'required' });
      if (!(need.status as readonly string[]).includes(i.status))
        ctx.addIssue({ code: 'custom', path: ['status'], message: `one of ${need.status.join(', ')}` });
      if (need.money === 'never' && i.money)
        ctx.addIssue({ code: 'custom', path: ['money'], message: 'not for DPIA' });
      if (need.money === 'required' && !i.money)
        ctx.addIssue({ code: 'custom', path: ['money'], message: 'required' });
    }),
  describe: (i) => `Record ${i.kind} on site ${i.siteId}`,
  handle: async (ctx, i) => {
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const m = i.money;
    let amounts = {};
    if (m) {
      const eur = m.currency === 'EUR';
      if (!eur && (!m.fxRate || !m.fxDate || !m.fxSource)) {
        throw new ValidationFailed([
          { path: 'money', message: 'a non-EUR amount needs fxRate, fxDate and fxSource' },
        ]);
      }
      const rate = eur ? '1' : (m.fxRate ?? '1');
      amounts = {
        amount: m.amount,
        currency: m.currency,
        eurAmount: toEur(m.amount, rate),
        fxRate: rate,
        fxDate: eur ? (m.fxDate ?? i.recordDate) : m.fxDate,
        fxSource: eur ? (m.fxSource ?? 'manual') : m.fxSource,
      };
    }
    const byAgent = ctx.actor.via !== undefined;
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      kind: i.kind,
      reference: NEEDS[i.kind].reference ? (i.reference ?? null) : null,
      status: i.status,
      recordDate: i.recordDate,
      ...amounts,
      sourceRef: i.sourceRef ?? null,
      proposedBy: ctx.actor.id,
      proposedVia: byAgent ? ('ai' as const) : ('web' as const),
      confirmedBy: byAgent ? null : ctx.actor.id,
      confirmedAt: byAgent ? null : ctx.now,
      createdAt: ctx.now,
    };
    await insertRecord(ctx.tx, row);
    ctx.emit(
      'commercial.record.proposed',
      { recordId: row.id, siteId: row.siteId, kind: row.kind, confirmed: !byAgent },
      row.clientId,
    );
    return {
      result: { id: row.id, confirmed: !byAgent },
      audit: {
        objectType: 'commercial_record',
        objectId: row.id,
        clientId: row.clientId,
        before: null,
        after: row,
      },
    };
  },
});
