// org.client.create — E1 AC1: the client is the top of the SOP-DEL-02 §3 hierarchy and the tenant every
// client-data row belongs to. Its short code starts every Project ID (D-18).
import { z } from 'zod';
import { Conflict, defineCommand } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { findClientByShortCode, insertClient } from '../repository.ts';
import { checkClientShortCode } from '../rules/client-short-code.ts';

export const createClient = defineCommand({
  name: 'org.client.create',
  permission: orgPermissions.createClient,
  input: z.object({
    shortCode: z.string().trim().toUpperCase(),
    name: z.string().trim().min(1).max(200),
  }),
  describe: (i) => `Create client ${i.shortCode} (${i.name})`,
  handle: async (ctx, i) => {
    checkClientShortCode(i.shortCode);
    if (await findClientByShortCode(ctx.tx, i.shortCode)) {
      throw new Conflict(`Short code ${i.shortCode} is already used by another client`);
    }
    const row = { id: ctx.newId(), shortCode: i.shortCode, name: i.name };
    await insertClient(ctx.tx, { ...row, createdAt: ctx.now });
    ctx.emit('org.client.created', { clientId: row.id, shortCode: row.shortCode }, row.id);
    return {
      result: row,
      audit: { objectType: 'client', objectId: row.id, clientId: row.id, before: null, after: row },
    };
  },
});
