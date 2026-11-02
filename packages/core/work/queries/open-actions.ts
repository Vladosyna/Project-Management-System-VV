// work.action.list — E5 AC1: open actions by project or owner, earliest due first, overdue marked.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { listOpenActions } from '../repository.ts';

export interface OpenAction {
  readonly id: string;
  readonly siteId: string | null;
  readonly projectId: string | null;
  readonly title: string;
  /** An OCS user (with the name the actor may see) or a person outside OCS by name. */
  readonly owner: { readonly userId: string; readonly name: string | null } | { readonly name: string };
  readonly due: string;
  readonly overdue: boolean;
  readonly status: 'open' | 'in_progress';
  readonly source: { readonly kind: string; readonly ref: string | null };
}

export const openActions = defineQuery({
  name: 'work.action.list',
  permission: workPermissions.openActions,
  input: z.object({
    siteId: z.uuid().optional(),
    ownerId: z.uuid().optional(),
    mine: z.boolean().optional(),
  }),
  handle: async (ctx, i): Promise<OpenAction[]> => {
    const today = ctx.now.toISOString().slice(0, 10);
    const rows = await listOpenActions(ctx.tx, {
      siteId: i.siteId,
      ownerId: i.mine ? ctx.actor.id : i.ownerId,
    });
    return rows.map(({ action: r, projectId, ownerUserName }) => ({
      id: r.id,
      siteId: r.siteId,
      projectId,
      title: r.title,
      owner: r.ownerId ? { userId: r.ownerId, name: ownerUserName } : { name: r.ownerName ?? '' },
      due: r.due,
      overdue: r.due < today,
      status: r.status as 'open' | 'in_progress',
      source: { kind: r.sourceKind, ref: r.sourceRef },
    }));
  },
});
