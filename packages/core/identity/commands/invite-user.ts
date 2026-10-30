import { InviteUserRequest } from '@ocs/contracts';
import { Conflict, defineCommand, Forbidden, grantOf } from '../../kernel/index.ts';
import { newInvitationToken } from '../invitation-token.ts';
import { identityPermissions } from '../permissions.ts';
import { findOpenInvitationForEmail, findUserByEmail, insertInvitation } from '../repository.ts';
import { invitationPolicy } from '../rules/invitation.config.ts';

/** Invites a staff user. External users (client, partner) are invited from V1.1, after the security review. */
export const inviteUser = defineCommand({
  name: 'identity.user.invite',
  permission: identityPermissions.inviteUser,
  input: InviteUserRequest,
  describe: (i) => `Invite ${i.email} as ${i.roles.join(', ')}`,
  handle: async (ctx, i) => {
    const mayAssign = grantOf(identityPermissions.assignRoles)?.roles ?? [];
    const elevated = i.roles.filter((r) => invitationPolicy.elevatedRoles.includes(r));
    if (elevated.length > 0 && !ctx.actor.roles.some((r) => mayAssign.includes(r))) {
      throw new Forbidden(identityPermissions.assignRoles);
    }
    if (await findUserByEmail(ctx.tx, i.email)) throw new Conflict(`A user with ${i.email} already exists`);
    if (await findOpenInvitationForEmail(ctx.tx, i.email)) {
      throw new Conflict(`${i.email} already has an open invitation`);
    }

    const { token, tokenHash } = newInvitationToken();
    const id = ctx.newId();
    const expiresAt = new Date(ctx.now.getTime() + invitationPolicy.validDays * 86_400_000);
    const roles = [...new Set(i.roles)].sort();
    await insertInvitation(ctx.tx, {
      id,
      email: i.email.toLowerCase(),
      kind: 'staff',
      roles,
      tokenHash,
      invitedBy: ctx.actor.id,
      createdAt: ctx.now,
      expiresAt,
    });
    ctx.emit('identity.invitation.created', { invitationId: id });
    return {
      // The token leaves OCS only here, once, for the inviter to pass on. It is never stored or audited.
      result: { invitationId: id, token, expiresAt },
      audit: {
        objectType: 'invitation',
        objectId: id,
        clientId: null,
        before: null,
        after: { email: i.email.toLowerCase(), kind: 'staff', roles, expiresAt },
      },
    };
  },
});
