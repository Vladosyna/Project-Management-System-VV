// work.action.create — E5 AC1: an action has one owner and a due date (SOP-DEL-03 "every action gets an
// owner and a date, including your own"), a source and the project it belongs to.
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { findActiveSite, insertAction } from '../repository.ts';

export const actionSources = ['manual', 'mail', 'dingtalk', 'meeting', 'visit', 'alert', 'comment'] as const;

export const createAction = defineCommand({
  name: 'work.action.create',
  permission: workPermissions.createAction,
  input: z.object({
    siteId: z.uuid(),
    title: z.string().trim().min(1).max(300),
    /** An OCS user, or a person outside OCS by name (client IT, landlord…). */
    owner: z.union([
      z.strictObject({ userId: z.uuid() }),
      z.strictObject({ name: z.string().trim().min(1).max(200) }),
    ]),
    due: z.iso.date(),
    source: z.strictObject({
      kind: z.enum(actionSources),
      ref: z.string().trim().min(1).max(500).optional(),
    }),
    visibility: z.enum(['internal', 'client']).default('internal'),
  }),
  describe: (i) => `Create action "${i.title}" due ${i.due}`,
  handle: async (ctx, i) => {
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      title: i.title,
      ownerId: 'userId' in i.owner ? i.owner.userId : null,
      ownerName: 'name' in i.owner ? i.owner.name : null,
      due: i.due,
      sourceKind: i.source.kind,
      sourceRef: i.source.ref ?? null,
      visibility: i.visibility,
      createdBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    await insertAction(ctx.tx, row);
    ctx.emit(
      'work.action.created',
      { actionId: row.id, siteId: row.siteId, ownerId: row.ownerId, due: row.due },
      row.clientId,
    );
    return {
      result: { id: row.id },
      audit: { objectType: 'action', objectId: row.id, clientId: row.clientId, before: null, after: row },
    };
  },
});
