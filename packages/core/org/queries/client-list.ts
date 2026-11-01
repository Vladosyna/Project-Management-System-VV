// org.client.list — E1 AC1. RLS limits the rows: staff see every client, a client user only its own.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { listActiveClients } from '../repository.ts';

export const clientList = defineQuery({
  name: 'org.client.list',
  permission: orgPermissions.clientList,
  input: z.object({}),
  handle: async (ctx) =>
    (await listActiveClients(ctx.tx)).map((c) => ({ id: c.id, shortCode: c.shortCode, name: c.name })),
});
