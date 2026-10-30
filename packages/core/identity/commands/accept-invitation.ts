import { z } from 'zod';
import { RoleSchema } from '@ocs/contracts';
import { Conflict, defineCommand, NotFound } from '../../kernel/index.ts';
import { identityPermissions } from '../permissions.ts';
import { findInvitation, findUser, grantRoles, markInvitationAccepted } from '../repository.ts';

/** Runs as the system actor right after the invited person's account was created: grants the invited roles. */
export const acceptInvitation = defineCommand({
  name: 'identity.invitation.accept',
  permission: identityPermissions.acceptInvitation,
  input: z.object({ invitationId: z.uuid(), userId: z.uuid() }),
  describe: (i) => `Accept invitation ${i.invitationId} for user ${i.userId}`,
  handle: async (ctx, i) => {
    const inv = await findInvitation(ctx.tx, i.invitationId);
    if (!inv) throw new NotFound('invitation', i.invitationId);
    if (inv.acceptedAt || inv.revokedAt) throw new Conflict('Invitation is no longer open');
    const user = await findUser(ctx.tx, i.userId);
    if (!user) throw new NotFound('user', i.userId);
    if (user.email.toLowerCase() !== inv.email.toLowerCase())
      throw new Conflict('Invitation is for another email');

    const roles = z.array(RoleSchema).parse(inv.roles);
    await markInvitationAccepted(ctx.tx, inv.id, user.id, ctx.now);
    await grantRoles(
      ctx.tx,
      roles.map((role) => ({
        id: ctx.newId(),
        userId: user.id,
        role,
        grantedBy: inv.invitedBy,
        grantedAt: ctx.now,
      })),
    );
    ctx.emit('identity.user.joined', { userId: user.id });
    return {
      result: { userId: user.id, roles },
      audit: {
        objectType: 'user',
        objectId: user.id,
        clientId: null,
        before: null,
        after: { invitationId: inv.id, kind: user.kind, roles },
      },
    };
  },
});
