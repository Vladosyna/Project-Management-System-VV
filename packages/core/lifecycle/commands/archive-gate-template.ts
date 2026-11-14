// lifecycle.gateTemplate.archive — D-32: a director or above retires a template; its projects then take the next
// scope (e.g. the client's template instead of the client + country one). Archived, never deleted.
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { archiveTemplate } from '../repository.ts';

export const archiveGateTemplate = defineCommand({
  name: 'lifecycle.gateTemplate.archive',
  permission: lifecyclePermissions.archiveGateTemplate,
  input: z.object({ id: z.uuid() }),
  describe: (i) => `Archive gate template ${i.id}`,
  handle: async (ctx, i) => {
    if (!(await archiveTemplate(ctx.tx, i.id, ctx.now))) throw new NotFound('gate_template', i.id);
    return {
      result: { id: i.id },
      audit: {
        objectType: 'gate_template',
        objectId: i.id,
        clientId: null,
        before: null,
        after: { archived: true },
      },
    };
  },
});
