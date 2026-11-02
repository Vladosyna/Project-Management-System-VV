// work.action.complete — E5 AC1: the owner marks their action done; a director or PM may close anyone's.
import { z } from 'zod';
import { Conflict, defineCommand, Forbidden, NotFound } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { lockActiveAction, markActionDone } from '../repository.ts';

/** Roles that may close actions owned by someone else (they run the project). */
const CLOSE_ANY = ['director', 'pm'] as const;

export const completeAction = defineCommand({
  name: 'work.action.complete',
  permission: workPermissions.completeAction,
  input: z.object({ actionId: z.uuid() }),
  describe: (i) => `Mark action ${i.actionId} done`,
  handle: async (ctx, i) => {
    const current = await lockActiveAction(ctx.tx, i.actionId);
    if (!current) throw new NotFound('action', i.actionId);
    const mayCloseAny = ctx.actor.roles.some((r) => (CLOSE_ANY as readonly string[]).includes(r));
    if (current.ownerId !== ctx.actor.id && !mayCloseAny) {
      throw new Forbidden(`${workPermissions.completeAction} (not the owner)`);
    }
    if (current.status === 'done' || current.status === 'cancelled') {
      throw new Conflict(`Action "${current.title}" is already ${current.status}`);
    }
    await markActionDone(ctx.tx, current.id, ctx.now);
    ctx.emit('work.action.completed', { actionId: current.id, siteId: current.siteId }, current.clientId);
    return {
      result: { id: current.id, status: 'done' as const },
      audit: {
        objectType: 'action',
        objectId: current.id,
        clientId: current.clientId,
        before: { status: current.status },
        after: { status: 'done', doneAt: ctx.now.toISOString() },
      },
    };
  },
});
