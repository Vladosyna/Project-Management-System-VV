import { z } from 'zod';
import { Conflict, defineCommand } from '../../kernel/index.ts';
import { newInvitationToken } from '../invitation-token.ts';
import { identityPermissions } from '../permissions.ts';
import { countUsers, findOpenInvitationForEmail, insertInvitation } from '../repository.ts';
import { invitationPolicy } from '../rules/invitation.config.ts';

/** Installation step: invite the first admin. Refused as soon as any user exists. */
export const bootstrapAdmin = defineCommand({
  name: 'identity.invitation.bootstrapAdmin',
  permission: identityPermissions.bootstrapAdmin,
  input: z.object({ email: z.email().max(254) }),
  describe: (i) => `Invite the first admin ${i.email}`,
  handle: async (ctx, i) => {
    if ((await countUsers(ctx.tx)) > 0) throw new Conflict('Users already exist — invite through an admin');
    if (await findOpenInvitationForEmail(ctx.tx, i.email)) {
      throw new Conflict(`${i.email} already has an open invitation`);
    }
    const { token, tokenHash } = newInvitationToken();
    const id = ctx.newId();
    const expiresAt = new Date(ctx.now.getTime() + invitationPolicy.validDays * 86_400_000);
    await insertInvitation(ctx.tx, {
      id,
      email: i.email.toLowerCase(),
      kind: 'staff',
      roles: ['admin'],
      tokenHash,
      invitedBy: ctx.actor.id,
      createdAt: ctx.now,
      expiresAt,
    });
    return {
      result: { invitationId: id, token, expiresAt },
      audit: {
        objectType: 'invitation',
        objectId: id,
        clientId: null,
        before: null,
        after: { email: i.email.toLowerCase(), kind: 'staff', roles: ['admin'], expiresAt },
      },
    };
  },
});
