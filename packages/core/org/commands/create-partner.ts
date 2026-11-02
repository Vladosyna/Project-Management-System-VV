// org.partner.create — E1 AC4: a partner company with its real name, which only staff ever see
// (CLAUDE.md §3 rule 5). Clients see it through a per-client label (org.partner.assign).
import { z } from 'zod';
import { defineCommand } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { insertPartner } from '../repository.ts';

export const createPartner = defineCommand({
  name: 'org.partner.create',
  permission: orgPermissions.createPartner,
  input: z.object({
    realName: z.string().trim().min(1).max(200),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
  }),
  describe: (i) => `Register partner ${i.realName}`,
  handle: async (ctx, i) => {
    const row = { id: ctx.newId(), realName: i.realName, countryCode: i.countryCode };
    await insertPartner(ctx.tx, { ...row, createdAt: ctx.now });
    return {
      result: { id: row.id },
      audit: { objectType: 'partner', objectId: row.id, clientId: null, before: null, after: row },
    };
  },
});
