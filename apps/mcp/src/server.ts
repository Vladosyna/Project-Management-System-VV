// MCP server for one person's AI agent (D-07, D-33). Its tools are generated from the operation registry: each
// query a read tool, each command a write tool, named after the operation with dots as underscores (the most
// portable tool-name form across MCP clients), described by its permission, with its zod input as JSON Schema.
// Only operations the person's roles hold are listed; every call still goes through the kernel — permission
// check, validation, rules, RLS, audit as "<person> via mcp" — so an agent can never do more than its person.
// Nothing here sends anything to a client (CLAUDE.md rule 4): no command does.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Actor } from '@ocs/contracts';
import { DomainError, type Kernel } from '@ocs/core/kernel';
import { operationsFor, type OperationInfo } from '@ocs/core/runtime';
import { AGENT_INSTRUCTIONS } from './instructions.ts';

export const toolName = (operation: string) => operation.replaceAll('.', '_');

const text = (value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }];

/** The MCP server for this person; one per session, so the tool list follows their roles. */
export function createOcsMcpServer(kernel: Pick<Kernel, 'execute' | 'read'>, actor: Actor): McpServer {
  const mcp = new McpServer(
    { name: 'ocs', version: '1.0.0', title: 'OCS — Vionvision delivery platform' },
    {
      capabilities: { tools: {} },
      instructions: AGENT_INSTRUCTIONS,
    },
  );
  // Tools come from the registry with ready JSON Schemas, so they are served by the protocol-level handlers.
  const { server } = mcp;
  const tools = new Map<string, OperationInfo>(operationsFor(actor).map((o) => [toolName(o.name), o]));

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [...tools.entries()].map(([name, o]) => ({
      name,
      title: o.name,
      description: `${o.description}${o.kind === 'query' ? '' : ' (changes data; recorded in the audit log)'}`,
      inputSchema: o.inputSchema as { type: 'object' },
      annotations: {
        readOnlyHint: o.kind === 'query',
        // Records are never deleted (CLAUDE.md rule 10); writes add or update.
        destructiveHint: false,
        openWorldHint: false,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const o = tools.get(request.params.name);
    if (!o) return { isError: true, content: text({ error: 'unknown_tool', tool: request.params.name }) };
    const input = request.params.arguments ?? {};
    try {
      const result =
        o.operation.kind === 'query'
          ? await kernel.read(o.operation, actor, input)
          : await kernel.execute(o.operation, actor, input, 'mcp');
      return { content: text(result ?? null) };
    } catch (err) {
      // Domain errors are answers the person should see (403, 404, 409, 422 with the SOP clause, 400).
      if (err instanceof DomainError) {
        return { isError: true, content: text({ error: err.code, message: err.message }) };
      }
      throw err;
    }
  });
  return mcp;
}
