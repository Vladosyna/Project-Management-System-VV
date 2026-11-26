// installers.quote.confirm — 08-ai-and-mcp (D-34 N5): a person confirms an installer quote an AI agent proposed; an
// agent never confirms money data.
import { z } from 'zod';
import { Conflict, defineCommand, Forbidden, NotFound } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { confirmQuoteRow, lockActiveQuote } from '../repository.ts';

export const confirmQuote = defineCommand({
  name: 'installers.quote.confirm',
  permission: installersPermissions.confirmQuote,
  input: z.object({ quoteId: z.uuid() }),
  describe: (i) => `Confirm installer quote ${i.quoteId}`,
  handle: async (ctx, i) => {
    if (ctx.actor.via !== undefined)
      throw new Forbidden('installers.quote.confirm (a person, not an AI agent)');
    const q = await lockActiveQuote(ctx.tx, i.quoteId);
    if (!q) throw new NotFound('price_proposal', i.quoteId);
    if (q.confirmedAt) throw new Conflict('this quote is already confirmed');
    await confirmQuoteRow(ctx.tx, q.id, ctx.actor.id, ctx.now);
    ctx.emit('installers.quote.confirmed', { quoteId: q.id, jobId: q.jobId }, q.clientId);
    return {
      result: { id: q.id },
      audit: {
        objectType: 'price_proposal',
        objectId: q.id,
        clientId: q.clientId,
        before: { confirmedAt: null },
        after: { confirmedBy: ctx.actor.id, confirmedAt: ctx.now },
      },
    };
  },
});
