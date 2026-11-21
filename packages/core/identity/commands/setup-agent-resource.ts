// identity.agentResource.setup — D-33: the permission check and audit record for creating the MCP resource client
// (token introspection). The client itself is created by better-auth for the signed-in admin right after this; its
// secret is shown once and goes to the secret store (never stored by OCS in clear, CLAUDE.md rule 6).
import { z } from 'zod';
import { defineCommand } from '../../kernel/index.ts';
import { identityPermissions } from '../permissions.ts';

export const setupAgentResource = defineCommand({
  name: 'identity.agentResource.setup',
  permission: identityPermissions.setupAgentResource,
  input: z.object({}),
  describe: () => 'Set up the MCP resource client for AI agent token introspection',
  handle: (ctx) =>
    Promise.resolve({
      result: { requestedBy: ctx.actor.id },
      audit: {
        objectType: 'oauth_resource',
        objectId: 'mcp',
        clientId: null,
        before: null,
        after: { setup: true },
      },
    }),
});
