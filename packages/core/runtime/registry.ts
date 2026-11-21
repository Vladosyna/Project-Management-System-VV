// The registry of every command and query (D-33): what AI platforms are offered — as MCP tools (apps/mcp) and
// REST + OpenAPI — generated from the same definitions the web app uses, never a hand-kept list. Each query is a
// read tool, each command a write tool; the zod input is the JSON Schema, the permission description is the tool
// description. Calls still go through the kernel: the caller's permissions, RLS, rules, audit (D-07).
import { z } from 'zod';
import type { Actor, Role } from '@ocs/contracts';
import * as calendar from '../calendar/index.ts';
import * as devices from '../devices/index.ts';
import * as identity from '../identity/index.ts';
import * as intake from '../intake/index.ts';
import { grantOf, type Command, type Query } from '../kernel/index.ts';
import * as lifecycle from '../lifecycle/index.ts';
import * as org from '../org/index.ts';
import * as work from '../work/index.ts';

/** Every module's public API (02-architecture §2); `pnpm gen:module` adds a line here too. */
const MODULES: Record<string, Record<string, unknown>> = {
  calendar,
  devices,
  identity,
  intake,
  lifecycle,
  org,
  work,
};

export type Operation = Command | Query;

export interface OperationInfo {
  readonly name: string;
  readonly kind: 'command' | 'query';
  readonly module: string;
  readonly description: string;
  readonly roles: readonly Role[];
  readonly inputSchema: Record<string, unknown>;
  readonly operation: Operation;
}

const isOperation = (v: unknown): v is Operation =>
  typeof v === 'object' &&
  v !== null &&
  'kind' in v &&
  (v.kind === 'command' || v.kind === 'query') &&
  'name' in v &&
  'permission' in v;

let cache: readonly OperationInfo[] | undefined;

/** Every command and query of every module, sorted by name. */
export function operations(): readonly OperationInfo[] {
  cache ??= Object.entries(MODULES)
    .flatMap(([module, api]) =>
      Object.values(api)
        .filter(isOperation)
        .map((op) => {
          const grant = grantOf(op.permission);
          return {
            name: op.name,
            kind: op.kind,
            module,
            description: grant?.description ?? '',
            roles: grant?.roles ?? [],
            inputSchema: z.toJSONSchema(op.input, { io: 'input', unrepresentable: 'any' }),
            operation: op,
          };
        }),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

/**
 * What an AI agent acting for this person may call: operations one of the person's roles holds. System-only
 * operations (sync, alert jobs) are never offered. The kernel checks again on every call.
 */
export function operationsFor(actor: Pick<Actor, 'roles'>): readonly OperationInfo[] {
  return operations().filter((o) => o.roles.some((r) => r !== 'system' && actor.roles.includes(r)));
}
