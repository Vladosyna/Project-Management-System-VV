import { z } from 'zod';
import { RoleSchema } from './roles.ts';

/** Who performs an operation (02-architecture §4). Built by the API/worker/MCP from the session; never from user input. */
export const ActorSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['staff', 'client', 'partner', 'system']),
  /** Clients the actor belongs to — external actors only; empty for staff and system. */
  clientIds: z.array(z.uuid()).readonly(),
  /** Roles from the user's account; permissions come from these (core/permissions). */
  roles: z.array(RoleSchema).readonly(),
  /** Set when an AI agent acts for the user, e.g. "mcp:claude" (08-ai-and-mcp). Recorded in audit. */
  via: z.string().min(1).max(64).optional(),
});
export type Actor = z.infer<typeof ActorSchema>;

/** Where a command came from; recorded in audit. */
export const CommandSourceSchema = z.enum([
  'web',
  'api',
  'mcp',
  'mail',
  'dingtalk',
  'import',
  'system',
  'test',
]);
export type CommandSource = z.infer<typeof CommandSourceSchema>;
