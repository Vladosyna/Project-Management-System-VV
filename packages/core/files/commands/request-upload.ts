// files.upload.request — D-46 (2): "Put in folder". A person asks OCS to upload a confirmed file into its DingTalk
// project folder by SOP-DEL-02; the worker does it (organisation app), records the DingTalk link and retries on
// failure. One request per file: asking twice is a conflict, not a second upload. Never by an AI agent.
import { z } from 'zod';
import { Conflict, defineCommand, Forbidden, NotFound, RuleViolation } from '../../kernel/index.ts';
import { filesPermissions } from '../permissions.ts';
import { insertUpload, lockActiveFile, uploadOf } from '../repository.ts';

export const requestUpload = defineCommand({
  name: 'files.upload.request',
  permission: filesPermissions.requestUpload,
  input: z.object({ fileId: z.uuid() }),
  describe: (i) => `Put file ${i.fileId} in its DingTalk project folder`,
  handle: async (ctx, i) => {
    if (ctx.actor.via !== undefined) throw new Forbidden('files.upload.request (a person, not an AI agent)');
    const file = await lockActiveFile(ctx.tx, i.fileId);
    if (!file) throw new NotFound('stored_file', i.fileId);
    if (!file.confirmedAt) throw new RuleViolation('D-46 (2)', 'confirm the file before it goes to DingTalk');
    if (file.dingtalkDentryId) throw new Conflict('this file is already in DingTalk');
    if (!file.objectKey) throw new RuleViolation('D-46 (1)', 'the file has no stored copy to upload');
    if (await uploadOf(ctx.tx, file.id)) throw new Conflict('an upload of this file is already requested');
    const row = {
      id: ctx.newId(),
      clientId: file.clientId,
      fileId: file.id,
      requestedBy: ctx.actor.id,
      requestedAt: ctx.now,
    };
    await insertUpload(ctx.tx, row);
    ctx.emit('files.upload.requested', { uploadId: row.id, fileId: file.id }, file.clientId);
    return {
      result: { uploadId: row.id },
      audit: {
        objectType: 'dingtalk_upload',
        objectId: row.id,
        clientId: row.clientId,
        before: null,
        after: row,
      },
    };
  },
});
