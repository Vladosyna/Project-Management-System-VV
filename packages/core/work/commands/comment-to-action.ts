// work.comment.toAction — E5 AC2 "turn into action": an action with an owner and a due date
// (SOP-DEL-03), linked to the comment it came from; project and client come from the comment.
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { findActiveComment, insertAction } from '../repository.ts';

export const commentToAction = defineCommand({
  name: 'work.comment.toAction',
  permission: workPermissions.commentToAction,
  input: z.object({
    commentId: z.uuid(),
    /** Defaults to the start of the comment. */
    title: z.string().trim().min(1).max(300).optional(),
    owner: z.union([
      z.strictObject({ userId: z.uuid() }),
      z.strictObject({ name: z.string().trim().min(1).max(200) }),
    ]),
    due: z.iso.date(),
  }),
  describe: (i) => `Turn comment ${i.commentId} into an action due ${i.due}`,
  handle: async (ctx, i) => {
    const source = await findActiveComment(ctx.tx, i.commentId);
    if (!source?.siteId) throw new NotFound('comment', i.commentId);
    const row = {
      id: ctx.newId(),
      clientId: source.clientId,
      siteId: source.siteId,
      title: i.title ?? source.body.slice(0, 300).trim(),
      ownerId: 'userId' in i.owner ? i.owner.userId : null,
      ownerName: 'name' in i.owner ? i.owner.name : null,
      due: i.due,
      sourceKind: 'comment' as const,
      sourceRef: source.id,
      commentId: source.id,
      visibility: 'internal' as const,
      createdBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    await insertAction(ctx.tx, row);
    ctx.emit(
      'work.action.created',
      { actionId: row.id, siteId: row.siteId, ownerId: row.ownerId, due: row.due, commentId: source.id },
      row.clientId,
    );
    return {
      result: { id: row.id },
      audit: { objectType: 'action', objectId: row.id, clientId: row.clientId, before: null, after: row },
    };
  },
});
