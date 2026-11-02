// work.comment.add — E5 AC2: a comment on a project; @mentioned staff get a notice (outbox event, staff
// only — a mention never notifies a client or partner, so an internal comment cannot leak through it).
import { z } from 'zod';
import { defineCommand, NotFound, ValidationFailed } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { activeStaffAmong, findActiveSite, insertComment } from '../repository.ts';

export const commentSources = ['manual', 'mail', 'dingtalk', 'meeting', 'visit', 'alert'] as const;

export const addComment = defineCommand({
  name: 'work.comment.add',
  permission: workPermissions.addComment,
  input: z.object({
    siteId: z.uuid(),
    body: z.string().trim().min(1).max(5000),
    mentions: z.array(z.uuid()).max(20).default([]),
    source: z
      .strictObject({ kind: z.enum(commentSources), ref: z.string().trim().min(1).max(500).optional() })
      .default({ kind: 'manual' }),
    visibility: z.enum(['internal', 'client']).default('internal'),
  }),
  describe: (i) => `Comment on site ${i.siteId}`,
  handle: async (ctx, i) => {
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const mentions = [...new Set(i.mentions)];
    const staff = await activeStaffAmong(ctx.tx, mentions);
    const unknown = mentions.filter((id) => !staff.has(id));
    if (unknown.length > 0) {
      throw new ValidationFailed([{ path: 'mentions', message: `not active staff: ${unknown.join(', ')}` }]);
    }
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      body: i.body,
      mentions,
      authorId: ctx.actor.id,
      sourceKind: i.source.kind,
      sourceRef: i.source.ref ?? null,
      visibility: i.visibility,
      createdAt: ctx.now,
    };
    await insertComment(ctx.tx, row);
    ctx.emit('work.comment.added', { commentId: row.id, siteId: row.siteId }, row.clientId);
    for (const userId of mentions) {
      ctx.emit('work.comment.mentioned', { commentId: row.id, siteId: row.siteId, userId }, row.clientId);
    }
    return {
      result: { id: row.id },
      audit: { objectType: 'comment', objectId: row.id, clientId: row.clientId, before: null, after: row },
    };
  },
});
