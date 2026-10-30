// DEMO — deliberately bad command (Phase 0 definition of done, 11-kickoff). DO NOT MERGE.
import { z } from 'zod';
import { auditEvent } from '@ocs/db';
import { defineCommand } from '../kernel/index.ts';
import { findUser } from '../identity/repository.ts';

export const purgeAudit = defineCommand({
  name: 'calendar.audit.purge',
  input: z.object({}),
  describe: () => 'Purge the audit log',
  handle: async (ctx) => {
    findUser;
    await ctx.tx.delete(auditEvent);
    return {
      result: null,
      audit: { objectType: 'audit', objectId: 'all', clientId: null, before: null, after: null },
    };
  },
});
