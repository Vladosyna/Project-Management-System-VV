// OpenAPI 3.1 of OCS for AI platforms without MCP (GPT Actions, Copilot Studio, n8n…), D-33. Generated from the same
// operation registry as the MCP tools: one POST per operation, its JSON Schema as the request body, its permission
// description as the summary. Sign-in is OAuth 2.0 authorization code + PKCE at OCS, as the person (D-07).
import type { OperationInfo } from '@ocs/core/runtime';

const errors = {
  '400': { description: 'Invalid input — the message names the fields' },
  '401': { description: 'No or inactive access token' },
  '403': { description: "The person's role may not do this" },
  '404': { description: 'Not found, or not visible to the person' },
  '409': { description: 'Conflict with the current state' },
  '422': { description: 'Refused by an SOP rule — `clause` names it' },
};

export function openApiDocument(origin: string, ops: readonly OperationInfo[]) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'OCS — Vionvision delivery platform',
      version: '1',
      description:
        'Every operation acts as the signed-in person with their permissions only, and is recorded in the audit log. ' +
        'Read before you write; never invent IDs, dates or names (docs/ocs/12-ai-agents.md). Nothing is ever sent to a client.',
    },
    servers: [{ url: `${origin}/api/v1` }],
    components: {
      securitySchemes: {
        ocs: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: `${origin}/api/auth/oauth2/authorize`,
              tokenUrl: `${origin}/api/auth/oauth2/token`,
              refreshUrl: `${origin}/api/auth/oauth2/token`,
              scopes: {
                openid: 'Who you are',
                offline_access: 'Stay connected until you disconnect the agent',
              },
            },
          },
        },
      },
    },
    security: [{ ocs: ['openid'] }],
    paths: Object.fromEntries(
      ops.map((o) => [
        `/${o.name}`,
        {
          post: {
            operationId: o.name.replaceAll('.', '_'),
            summary: o.description,
            tags: [o.module],
            'x-ocs-kind': o.kind,
            requestBody: { required: true, content: { 'application/json': { schema: o.inputSchema } } },
            responses: {
              '200': { description: o.kind === 'query' ? 'The result' : 'Done; recorded in the audit log' },
              ...errors,
            },
          },
        },
      ]),
    ),
  };
}
