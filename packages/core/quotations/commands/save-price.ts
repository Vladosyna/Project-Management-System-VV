// quotations.price.save — D-40, E15 AC1: a director sets a sensor model's unit price for a client; replaces the active one.
import { z } from 'zod';
import { defineCommand } from '../../kernel/index.ts';
import { quotationsPermissions } from '../permissions.ts';
import { archiveActivePrice, insertPrice } from '../repository.ts';

export const savePrice = defineCommand({
  name: 'quotations.price.save',
  permission: quotationsPermissions.savePrice,
  input: z.object({
    clientId: z.uuid(),
    model: z.string().trim().min(1).max(100),
    unitPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
  describe: (i) => `Set the price of ${i.model} for client ${i.clientId}: ${i.unitPrice} ${i.currency}`,
  handle: async (ctx, i) => {
    await archiveActivePrice(ctx.tx, i.clientId, i.model, i.currency, ctx.now);
    const row = { id: ctx.newId(), ...i, createdBy: ctx.actor.id, createdAt: ctx.now };
    await insertPrice(ctx.tx, row);
    return {
      result: { id: row.id },
      audit: { objectType: 'sensor_price', objectId: row.id, clientId: i.clientId, before: null, after: row },
    };
  },
});
