// org.complianceScope.set — D-45 (3): whether a client agrees DPIA and LPA per store ('site', default) or once per
// country ('country', Client A today). Directors only: it changes which records clear R24 and R40.
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { lockActiveClient, setClientComplianceScope } from '../repository.ts';

export const setComplianceScope = defineCommand({
  name: 'org.complianceScope.set',
  permission: orgPermissions.setComplianceScope,
  input: z.object({ clientId: z.uuid(), scope: z.enum(['site', 'country']) }),
  describe: (i) => `Set DPIA / LPA scope of client ${i.clientId} to ${i.scope}`,
  handle: async (ctx, i) => {
    const current = await lockActiveClient(ctx.tx, i.clientId);
    if (!current) throw new NotFound('client', i.clientId);
    await setClientComplianceScope(ctx.tx, current.id, i.scope);
    ctx.emit('org.client.complianceScopeSet', { clientId: current.id, scope: i.scope }, current.id);
    return {
      result: { clientId: current.id, scope: i.scope },
      audit: {
        objectType: 'client',
        objectId: current.id,
        clientId: current.id,
        before: { complianceScope: current.complianceScope },
        after: { complianceScope: i.scope },
      },
    };
  },
});
