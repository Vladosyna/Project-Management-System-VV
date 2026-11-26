// commercial.record.confirm — E13 AC1, 08-ai-and-mcp: a person confirms what an AI agent proposed. An agent may never
// confirm (money data is applied only by a person).
import { z } from 'zod';
import { Conflict, defineCommand, Forbidden, NotFound } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { lockActiveRecord, updateRecord } from '../repository.ts';

export const confirmRecord = defineCommand({
  name: 'commercial.record.confirm',
  permission: commercialPermissions.confirmRecord,
  input: z.object({ recordId: z.uuid() }),
  describe: (i) => `Confirm commercial record ${i.recordId}`,
  handle: async (ctx, i) => {
    if (ctx.actor.via !== undefined)
      throw new Forbidden('commercial.record.confirm (a person, not an AI agent)');
    const current = await lockActiveRecord(ctx.tx, i.recordId);
    if (!current) throw new NotFound('commercial_record', i.recordId);
    if (current.confirmedAt) throw new Conflict('this record is already confirmed');
    const set = { confirmedBy: ctx.actor.id, confirmedAt: ctx.now };
    await updateRecord(ctx.tx, current.id, set);
    ctx.emit(
      'commercial.record.confirmed',
      { recordId: current.id, siteId: current.siteId },
      current.clientId,
    );
    return {
      result: { id: current.id },
      audit: {
        objectType: 'commercial_record',
        objectId: current.id,
        clientId: current.clientId,
        before: { confirmedAt: null },
        after: set,
      },
    };
  },
});
