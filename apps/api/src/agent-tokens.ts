// D-33 / D-07: who is behind an AI agent's OAuth access token, and through which agent.
// With the resource client set up (OCS_MCP_INTROSPECTION_CLIENT_ID / _SECRET, created once by an admin on the Admin
// screen), tokens are checked by introspection (RFC 7662): active, issued for this resource (`aud`), and the agent's
// name goes into the audit ("via mcp:<agent>"). Without it, the provider's userinfo still proves the token active
// and whose it is, but neither the audience nor the agent is known — a warning says so at start.
import type { Runtime } from '@ocs/core/runtime';

export interface IntrospectionClient {
  readonly clientId: string;
  readonly clientSecret: string;
}
export interface AgentToken {
  readonly userId: string;
  /** For the audit: "<channel>:<agent name>", at most 64 characters. */
  readonly via: string;
}

export function createAgentTokenCheck(rt: Runtime, introspection: IntrospectionClient | undefined) {
  const names = new Map<string, string>();
  const nameOf = async (clientId: string) => {
    const known = names.get(clientId);
    if (known) return known;
    const { adapter } = await rt.auth.$context;
    const client = await adapter.findOne<{ name?: string | null }>({
      model: 'oauthClient',
      where: [{ field: 'clientId', value: clientId }],
    });
    const name = client?.name ?? clientId;
    names.set(clientId, name);
    return name;
  };

  /** `audience`: the resource the token must be issued for (e.g. <origin>/mcp); omit to accept any OCS audience. */
  /** Active and whose — no audience, no agent name. */
  const byUserInfo = async (token: string, channel: string): Promise<AgentToken | null> => {
    const info = (await rt.auth.api.oauth2UserInfo({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    })) as { sub?: string } | null;
    return info?.sub ? { userId: info.sub, via: channel } : null;
  };

  return async (token: string, channel: 'mcp' | 'api', audience?: string): Promise<AgentToken | null> => {
    try {
      if (!introspection) return await byUserInfo(token, channel);
      const result = (await rt.auth.api.oauth2Introspect({
        body: {
          client_id: introspection.clientId,
          client_secret: introspection.clientSecret,
          token,
          token_type_hint: 'access_token',
        },
      })) as { active?: boolean; sub?: string; client_id?: string; aud?: string | string[] };
      if (!result.active || !result.sub || !result.client_id) {
        // The resource client introspects only tokens issued for the MCP resource. A caller that names no audience
        // (REST: GPT Actions and the like send no RFC 8707 `resource`) still gets the person behind an active token.
        return audience ? null : await byUserInfo(token, channel);
      }
      const aud = Array.isArray(result.aud) ? result.aud : result.aud ? [result.aud] : [];
      if (audience && !aud.includes(audience)) return null;
      return { userId: result.sub, via: `${channel}:${await nameOf(result.client_id)}`.slice(0, 64) };
    } catch {
      return null;
    }
  };
}
