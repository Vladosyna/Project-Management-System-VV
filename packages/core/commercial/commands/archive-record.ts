// commercial.record.archive — a wrong or replaced record is archived with a reason, never deleted (SOP-DEL-02).
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { lockActiveRecord, updateRecord } from '../repository.ts';

export const archiveRecord = defineCommand({
  name: 'commercial.record.archive',
  permission: commercialPermissions.archiveRecord,
  input: z.object({ recordId: z.uuid(), reason: z.string().trim().min(1).max(500) }),
  describe: (i) => `Archive commercial record ${i.recordId}: ${i.reason}`,
  handle: async (ctx, i) => {
    const current = await lockActiveRecord(ctx.tx, i.recordId);
    if (!current) throw new NotFound('commercial_record', i.recordId);
    await updateRecord(ctx.tx, current.id, { archivedAt: ctx.now });
    ctx.emit(
      'commercial.record.archived',
      { recordId: current.id, siteId: current.siteId },
      current.clientId,
    );
    return {
      result: { id: current.id },
      audit: {
        objectType: 'commercial_record',
        objectId: current.id,
        clientId: current.clientId,
        before: current,
        after: { archivedAt: ctx.now, reason: i.reason },
      },
    };
  },
});
