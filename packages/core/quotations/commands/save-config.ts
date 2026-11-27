// quotations.config.save — D-40, E15 AC1: a director sets a client's quotation settings for one country. Replaces the
// active settings (the old row is archived, never deleted). VAT rate only with DDP local VAT.
import { z } from 'zod';
import { defineCommand, ValidationFailed } from '../../kernel/index.ts';
import { quotationsPermissions } from '../permissions.ts';
import { archiveActiveConfig, insertConfig } from '../repository.ts';

const party = z.record(z.string(), z.string().max(500));

export const saveConfig = defineCommand({
  name: 'quotations.config.save',
  permission: quotationsPermissions.saveConfig,
  input: z.object({
    clientId: z.uuid(),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
    hourlyRate: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
    taxMode: z.enum(['reverse_charge', 'ddp_local_vat']),
    vatRate: z
      .string()
      .regex(/^\d{1,2}(\.\d{1,2})?$/)
      .optional(),
    seller: party,
    buyer: party,
    bank: party,
    terms: z.array(z.string().trim().min(1).max(1000)).max(20),
    numberPrefix: z.string().regex(/^[A-Z0-9-]{1,20}$/),
  }),
  describe: (i) => `Set quotation settings for client ${i.clientId} in ${i.countryCode}`,
  handle: async (ctx, i) => {
    if ((i.taxMode === 'ddp_local_vat') !== (i.vatRate !== undefined)) {
      throw new ValidationFailed([
        { path: 'vatRate', message: 'required with DDP local VAT, not allowed otherwise' },
      ]);
    }
    await archiveActiveConfig(ctx.tx, i.clientId, i.countryCode, ctx.now);
    const row = {
      id: ctx.newId(),
      ...i,
      vatRate: i.vatRate ?? null,
      createdBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    await insertConfig(ctx.tx, row);
    ctx.emit('quotations.config.saved', { configId: row.id, countryCode: i.countryCode }, i.clientId);
    return {
      result: { id: row.id },
      audit: {
        objectType: 'client_quote_config',
        objectId: row.id,
        clientId: i.clientId,
        before: null,
        after: row,
      },
    };
  },
});
