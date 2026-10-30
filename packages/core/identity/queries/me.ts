import { z } from 'zod';
import { defineQuery, NotFound } from '../../kernel/index.ts';
import { identityPermissions } from '../permissions.ts';
import { activeRoles, findUser } from '../repository.ts';

/** The signed-in user's own profile, roles and MFA state. */
export const me = defineQuery({
  name: 'identity.self.read',
  permission: identityPermissions.readSelf,
  input: z.object({}),
  handle: async (ctx) => {
    const user = await findUser(ctx.tx, ctx.actor.id);
    if (!user) throw new NotFound('user', ctx.actor.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      kind: user.kind,
      roles: await activeRoles(ctx.tx, user.id),
      mfaEnabled: user.twoFactorEnabled === true,
    };
  },
});
