import { z } from 'zod';
import { defineQuery, NotFound } from '../../kernel/index.ts';
import { hashInvitationToken } from '../invitation-token.ts';
import { identityPermissions } from '../permissions.ts';
import { findOpenInvitationByTokenHash } from '../repository.ts';

/** An open, unexpired invitation by its link token. Unknown, used, revoked and expired all read as NotFound. */
export const invitationByToken = defineQuery({
  name: 'identity.invitation.byToken',
  permission: identityPermissions.readInvitationByToken,
  input: z.object({ token: z.string().min(20).max(200) }),
  handle: async (ctx, i) => {
    const inv = await findOpenInvitationByTokenHash(ctx.tx, hashInvitationToken(i.token));
    if (!inv || inv.expiresAt <= ctx.now) throw new NotFound('invitation', 'by token');
    return { id: inv.id, email: inv.email, kind: inv.kind, roles: inv.roles };
  },
});
