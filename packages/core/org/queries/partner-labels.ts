// org.partner.labels — the client-facing view of a client's partners: "Partner A", "Partner B" … and
// nothing else (CLAUDE.md §3 rule 5). RLS limits a client user to its own client.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { activeLetters } from '../repository.ts';

export const partnerLabels = defineQuery({
  name: 'org.partner.labels',
  permission: orgPermissions.partnerLabels,
  input: z.object({ clientId: z.uuid() }),
  handle: async (ctx, i) =>
    (await activeLetters(ctx.tx, i.clientId)).map((a) => ({ label: `Partner ${a.letter}` })),
});
