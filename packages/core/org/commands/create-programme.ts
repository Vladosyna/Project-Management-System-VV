// org.programme.create — E1 AC1: the optional level 1a of the SOP-DEL-02 §3 hierarchy, "only when the
// client runs separate programmes". Name unique within the client.
import { z } from 'zod';
import { Conflict, defineCommand, NotFound } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { findProgrammeByName, insertProgramme, lockActiveClient } from '../repository.ts';

export const createProgramme = defineCommand({
  name: 'org.programme.create',
  permission: orgPermissions.createProgramme,
  input: z.object({ clientId: z.uuid(), name: z.string().trim().min(1).max(200) }),
  describe: (i) => `Create programme ${i.name} for client ${i.clientId}`,
  handle: async (ctx, i) => {
    const owner = await lockActiveClient(ctx.tx, i.clientId);
    if (!owner) throw new NotFound('client', i.clientId);
    if (await findProgrammeByName(ctx.tx, owner.id, i.name)) {
      throw new Conflict(`Client ${owner.shortCode} already has a programme named ${i.name}`);
    }
    const row = { id: ctx.newId(), clientId: owner.id, name: i.name };
    await insertProgramme(ctx.tx, { ...row, createdAt: ctx.now });
    ctx.emit('org.programme.created', { programmeId: row.id }, owner.id);
    return {
      result: row,
      audit: { objectType: 'programme', objectId: row.id, clientId: owner.id, before: null, after: row },
    };
  },
});
