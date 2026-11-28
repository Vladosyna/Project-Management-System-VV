// files.file.store — D-46 (1): a file already written to EU object storage (by the API upload handler, never inline
// in the database, 03 §7) is recorded with its owner, SOP-DEL-02 folder, hash, size and type. A new version of the
// same owner's file archives the previous one (never deleted). From a person: confirmed at once. From an AI agent,
// the market link or a mail: waits for a person's confirmation before it may go to DingTalk.
import { z } from 'zod';
import { Conflict, defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { filesPermissions } from '../permissions.ts';
import {
  FILE_OWNER_TYPES,
  fileWithObjectKey,
  findActiveSite,
  insertFile,
  lockActiveFile,
  updateFile,
} from '../repository.ts';
import { filePolicy } from '../rules/file-policy.config.ts';

export const storeFile = defineCommand({
  name: 'files.file.store',
  permission: filesPermissions.storeFile,
  input: z.object({
    siteId: z.uuid(),
    ownerType: z.enum(FILE_OWNER_TYPES),
    ownerId: z.uuid().optional(),
    /** SOP-DEL-02 folder (L) or slot prefix (S), 00–11. */
    sopFolder: z.string().regex(/^(0[0-9]|1[01])$/),
    objectKey: z.string().trim().min(1).max(500),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    sizeBytes: z.number().int().positive(),
    mimeType: z.string().min(1).max(200),
    originalName: z.string().trim().min(1).max(255),
    /** How it arrived when not typed in by the person: the market link or a mail (the agent sets via itself). */
    arrivedVia: z.enum(['market_link', 'mail']).optional(),
    sourceRef: z.string().trim().min(1).max(500).optional(),
    /** The file this one replaces (same owner). */
    supersedesId: z.uuid().optional(),
  }),
  describe: (i) => `Store file ${i.originalName} for ${i.ownerType} on site ${i.siteId}`,
  handle: async (ctx, i) => {
    if (!(filePolicy.mimeTypes as readonly string[]).includes(i.mimeType))
      throw new RuleViolation(filePolicy.cite, `file type ${i.mimeType} is not accepted`);
    if (i.sizeBytes > filePolicy.maxBytes)
      throw new RuleViolation(filePolicy.cite, 'file larger than 100 MB; split it into parts');
    const place = await findActiveSite(ctx.tx, i.siteId);
    if (!place) throw new NotFound('site', i.siteId);
    let version = 1;
    if (i.supersedesId) {
      const previous = await lockActiveFile(ctx.tx, i.supersedesId);
      if (previous?.siteId !== place.id || previous.ownerType !== i.ownerType)
        throw new NotFound('stored_file', i.supersedesId);
      await updateFile(ctx.tx, previous.id, { archivedAt: ctx.now });
      version = previous.version + 1;
    }
    const byAgent = ctx.actor.via !== undefined;
    const byPerson = !byAgent && i.arrivedVia === undefined;
    const row = {
      id: ctx.newId(),
      clientId: place.clientId,
      siteId: place.id,
      ownerType: i.ownerType,
      ownerId: i.ownerId ?? null,
      sopFolder: i.sopFolder,
      objectKey: i.objectKey,
      sha256: i.sha256,
      sizeBytes: i.sizeBytes,
      mimeType: i.mimeType,
      originalName: i.originalName,
      version,
      supersedesId: i.supersedesId ?? null,
      uploadedBy: ctx.actor.id,
      uploadedVia: byAgent ? ('ai' as const) : (i.arrivedVia ?? ('web' as const)),
      sourceRef: i.sourceRef ?? null,
      confirmedBy: byPerson ? ctx.actor.id : null,
      confirmedAt: byPerson ? ctx.now : null,
      createdAt: ctx.now,
    };
    if (await fileWithObjectKey(ctx.tx, i.objectKey))
      throw new Conflict('this stored object is already recorded');
    await insertFile(ctx.tx, row);
    ctx.emit('files.file.stored', { fileId: row.id, siteId: row.siteId, confirmed: byPerson }, row.clientId);
    return {
      result: { id: row.id, version, confirmed: byPerson },
      audit: {
        objectType: 'stored_file',
        objectId: row.id,
        clientId: row.clientId,
        before: null,
        after: row,
      },
    };
  },
});
