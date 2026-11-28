// files.file.confirm — D-46 (2), 08-ai-and-mcp: a person confirms a file an AI agent, the market link or a mail
// brought in (e.g. accepts the Market Input). An agent may never confirm.
import { z } from 'zod';
import { Conflict, defineCommand, Forbidden, NotFound } from '../../kernel/index.ts';
import { filesPermissions } from '../permissions.ts';
import { lockActiveFile, updateFile } from '../repository.ts';

export const confirmFile = defineCommand({
  name: 'files.file.confirm',
  permission: filesPermissions.confirmFile,
  input: z.object({ fileId: z.uuid() }),
  describe: (i) => `Confirm file ${i.fileId}`,
  handle: async (ctx, i) => {
    if (ctx.actor.via !== undefined) throw new Forbidden('files.file.confirm (a person, not an AI agent)');
    const current = await lockActiveFile(ctx.tx, i.fileId);
    if (!current) throw new NotFound('stored_file', i.fileId);
    if (current.confirmedAt) throw new Conflict('this file is already confirmed');
    const set = { confirmedBy: ctx.actor.id, confirmedAt: ctx.now };
    await updateFile(ctx.tx, current.id, set);
    ctx.emit('files.file.confirmed', { fileId: current.id }, current.clientId);
    return {
      result: { id: current.id },
      audit: {
        objectType: 'stored_file',
        objectId: current.id,
        clientId: current.clientId,
        before: { confirmedAt: null },
        after: set,
      },
    };
  },
});
