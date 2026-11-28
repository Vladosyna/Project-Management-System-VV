// commercial.country.confirm — D-45, 08-ai-and-mcp: a person confirms a country DPIA or LPA an AI agent proposed.
// An agent may never confirm.
import { z } from 'zod';
import { Conflict, defineCommand, Forbidden, NotFound } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { lockActiveCountry, updateCountry } from '../repository.ts';

export const confirmCountry = defineCommand({
  name: 'commercial.country.confirm',
  permission: commercialPermissions.confirmCountry,
  input: z.object({ recordId: z.uuid() }),
  describe: (i) => `Confirm country DPIA / LPA ${i.recordId}`,
  handle: async (ctx, i) => {
    if (ctx.actor.via !== undefined)
      throw new Forbidden('commercial.country.confirm (a person, not an AI agent)');
    const current = await lockActiveCountry(ctx.tx, { id: i.recordId });
    if (!current) throw new NotFound('country_compliance', i.recordId);
    if (current.confirmedAt) throw new Conflict('this record is already confirmed');
    const set = { confirmedBy: ctx.actor.id, confirmedAt: ctx.now };
    await updateCountry(ctx.tx, current.id, set);
    ctx.emit('commercial.country.confirmed', { recordId: current.id }, current.clientId);
    return {
      result: { id: current.id },
      audit: {
        objectType: 'country_compliance',
        objectId: current.id,
        clientId: current.clientId,
        before: { confirmedAt: null },
        after: set,
      },
    };
  },
});
