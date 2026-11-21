// identity.agent.revoke — D-33: the audit record of a person disconnecting an AI agent. The tokens and the consent
// live in schema auth (ocs_auth only), so IdentityService.revokeAgent revokes them through better-auth first and
// then runs this command as the person: who disconnected which agent, when.
import { z } from 'zod';
import { defineCommand } from '../../kernel/index.ts';
import { identityPermissions } from '../permissions.ts';

export const revokeAgent = defineCommand({
  name: 'identity.agent.revoke',
  permission: identityPermissions.revokeAgent,
  input: z.object({
    clientId: z.string().min(1).max(200),
    accessTokens: z.int().min(0),
    refreshTokens: z.int().min(0),
  }),
  describe: (i) => `Disconnect AI agent ${i.clientId}`,
  handle: (ctx, i) =>
    Promise.resolve({
      result: { clientId: i.clientId },
      audit: {
        objectType: 'oauth_client',
        objectId: i.clientId,
        clientId: null,
        before: { connected: true },
        after: {
          connected: false,
          revokedAccessTokens: i.accessTokens,
          revokedRefreshTokens: i.refreshTokens,
        },
      },
    }),
});
