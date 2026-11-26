// installers.quote.propose — E12 AC3 (D-34 N1, N5): an installer's price proposal for a job, line by line (per unit,
// per hour, travel, extras), in its currency and in EUR with the rate used. A person's entry is confirmed at once; an
// AI agent's (actor.via) stays a proposal until a PM confirms it — money data is never applied unconfirmed.
import { z } from 'zod';
import { isAmount, isRate, toEur } from '../../commercial/index.ts';
import { defineCommand, NotFound, ValidationFailed } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { activeJob, activePartner, insertQuote } from '../repository.ts';

const price = z.string().refine(isAmount, 'up to 12 digits and 2 decimals');
const line = z.object({
  kind: z.enum(['unit', 'hour', 'travel', 'extra']),
  description: z.string().trim().min(1).max(300),
  quantity: z.number().positive().max(100_000),
  unitPrice: price,
});

const cents = (v: string): bigint => {
  const [whole = '0', frac = ''] = v.split('.');
  return BigInt(whole + frac.padEnd(2, '0'));
};

/** Σ quantity × unit price, exact in cents (quantities to 3 decimals), rounded half up. */
export function quoteTotal(lines: readonly { quantity: number; unitPrice: string }[]): string {
  const milliCents = lines.reduce(
    (sum, l) => sum + BigInt(Math.round(l.quantity * 1000)) * cents(l.unitPrice),
    0n,
  );
  const s = ((milliCents + 500n) / 1000n).toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

export const proposeQuote = defineCommand({
  name: 'installers.quote.propose',
  permission: installersPermissions.proposeQuote,
  input: z.object({
    jobId: z.uuid(),
    partnerId: z.uuid(),
    sowVersion: z.string().trim().min(1).max(50).optional(),
    lines: z.array(line).min(1).max(100),
    currency: z.string().regex(/^[A-Z]{3}$/),
    /** EUR per 1 unit of the currency; required unless EUR. */
    fxRate: z.string().refine(isRate, 'positive, up to 6 decimals').optional(),
    fxDate: z.iso.date(),
    fxSource: z.enum(['manual', 'agent', 'ecb']).default('manual'),
    validUntil: z.iso.date().optional(),
    source: z.object({
      kind: z.enum(['mail', 'pdf', 'xlsx', 'whatsapp', 'manual']),
      ref: z.string().trim().min(1).max(500).optional(),
    }),
  }),
  describe: (i) => `Record a quote for installer job ${i.jobId} in ${i.currency}`,
  handle: async (ctx, i) => {
    const job = await activeJob(ctx.tx, i.jobId);
    if (!job) throw new NotFound('installer_job', i.jobId);
    if (!(await activePartner(ctx.tx, i.partnerId))) throw new NotFound('partner', i.partnerId);
    const eur = i.currency === 'EUR';
    if (!eur && !i.fxRate)
      throw new ValidationFailed([{ path: 'fxRate', message: 'required for a non-EUR quote' }]);
    const rate = eur ? '1' : (i.fxRate ?? '1');
    const amount = quoteTotal(i.lines);
    const byAgent = ctx.actor.via !== undefined;
    const row = {
      id: ctx.newId(),
      clientId: job.clientId,
      jobId: job.id,
      partnerId: i.partnerId,
      sowVersion: i.sowVersion ?? job.sowVersion,
      lines: i.lines,
      amount,
      currency: i.currency,
      eurAmount: toEur(amount, rate),
      fxRate: rate,
      fxDate: i.fxDate,
      fxSource: i.fxSource,
      validUntil: i.validUntil ?? null,
      sourceKind: i.source.kind,
      sourceRef: i.source.ref ?? null,
      proposedBy: ctx.actor.id,
      proposedVia: byAgent ? ('ai' as const) : ('web' as const),
      confirmedBy: byAgent ? null : ctx.actor.id,
      confirmedAt: byAgent ? null : ctx.now,
      createdAt: ctx.now,
    };
    await insertQuote(ctx.tx, row);
    ctx.emit(
      'installers.quote.proposed',
      { quoteId: row.id, jobId: job.id, confirmed: !byAgent },
      job.clientId,
    );
    return {
      result: { id: row.id, amount, eurAmount: row.eurAmount, confirmed: !byAgent },
      audit: {
        objectType: 'price_proposal',
        objectId: row.id,
        clientId: job.clientId,
        before: null,
        after: row,
      },
    };
  },
});
