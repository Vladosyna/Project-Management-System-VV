// MCP over Streamable HTTP (D-33): the endpoint AI clients call with the OAuth access token a person granted them.
// Stateless: each request gets its own server for the token's person, so the tool list always follows their
// current roles. No valid token → 401 with the protected-resource metadata link (RFC 9728), which is how MCP
// clients discover where to sign in. The kernel checks every call again; nothing here grants anything.
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Actor } from '@ocs/contracts';
import type { Kernel } from '@ocs/core/kernel';
import { createOcsMcpServer } from './server.ts';

export interface McpHttpDeps {
  readonly kernel: Pick<Kernel, 'execute' | 'read'>;
  /** The person behind an access token and the audit label of the agent, or null when the token is not active. */
  readonly personOf: (accessToken: string) => Promise<{ userId: string; via: string } | null>;
  /** The person as an actor (roles, archived users refused), or null. */
  readonly loadActor: (userId: string) => Promise<Actor | undefined>;
  /** Absolute URL of /.well-known/oauth-protected-resource for this deployment. */
  readonly resourceMetadataUrl: string;
}

const unauthorized = (resourceMetadataUrl: string, error?: 'invalid_token') =>
  new Response(JSON.stringify({ error: error ?? 'unauthorized' }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': `Bearer resource_metadata="${resourceMetadataUrl}"${error ? `, error="${error}"` : ''}`,
    },
  });

export function createMcpHttpHandler(deps: McpHttpDeps) {
  return async (request: Request): Promise<Response> => {
    const header = request.headers.get('authorization') ?? '';
    const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
    if (!token) return unauthorized(deps.resourceMetadataUrl);
    const agent = await deps.personOf(token);
    const person = agent ? await deps.loadActor(agent.userId) : undefined;
    if (!agent || !person) return unauthorized(deps.resourceMetadataUrl, 'invalid_token');
    // Stateless (no session id): each request carries its token. Audit shows "<person> via mcp:<agent>" (D-07).
    const actor: Actor = { ...person, via: agent.via };
    const server = createOcsMcpServer(deps.kernel, actor);
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await server.close();
    }
  };
}
