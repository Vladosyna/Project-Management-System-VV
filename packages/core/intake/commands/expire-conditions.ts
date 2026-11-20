// intake.conditions.expire — E2 AC3, SOP-DEL-01 §8: a condition of acceptance not met by its deadline expires,
// and the alert goes to the project's Sales owner and the Delivery Director. This command marks the conditions
// expired and returns who must hear of it; the worker raises the alert actions (work.alert.raise). System only;
// a second run on the same day finds nothing new.
import { z } from 'zod';
import { localDateIn } from '../../calendar/index.ts';
import { defineCommand } from '../../kernel/index.ts';
import { intakePermissions } from '../permissions.ts';
import { directorIds, expireConditions as markExpired, lockOverdueConditions } from '../repository.ts';

const salesOwnerOf = (content: unknown): string | null => {
  const id = (content as { identification?: { salesOwnerId?: unknown } }).identification?.salesOwnerId;
  return typeof id === 'string' ? id : null;
};

export const expireConditions = defineCommand({
  name: 'intake.conditions.expire',
  permission: intakePermissions.expireConditions,
  input: z.object({}),
  describe: () => 'Expire intake conditions past their deadline',
  handle: async (ctx) => {
    const today = localDateIn(ctx.now, 'UTC');
    const overdue = await lockOverdueConditions(ctx.tx, today);
    await markExpired(
      ctx.tx,
      overdue.map((c) => c.id),
    );
    const directors = await directorIds(ctx.tx);
    const expired = overdue.map((c) => ({
      conditionId: c.id,
      siteId: c.siteId,
      projectId: c.projectId,
      itemCode: c.itemCode,
      deadline: c.deadline,
      /** Who must hear of it: the Sales owner named on the card, and every Delivery Director. */
      notify: [...new Set([salesOwnerOf(c.content), ...directors].filter((x) => x !== null))],
    }));
    const result = { today, expired };
    return {
      result,
      audit: {
        objectType: 'intake_condition_run',
        objectId: ctx.newId(),
        clientId: null,
        before: null,
        after: result,
      },
    };
  },
});
