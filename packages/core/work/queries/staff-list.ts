// work.staff.list — E5 AC2: the active staff a comment may @mention or an action may name as owner.
// Names only — no e-mail, roles or anything else from the account.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { listActiveStaff } from '../repository.ts';

export const staffList = defineQuery({
  name: 'work.staff.list',
  permission: workPermissions.staffList,
  input: z.object({}),
  handle: (ctx) => listActiveStaff(ctx.tx),
});
