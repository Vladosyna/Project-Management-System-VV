// defineCommand / defineQuery (02-architecture §3, F0.7). A command cannot be defined without a
// permission key, an input schema and an audit description — the types refuse it.
import type { z } from 'zod';
import type { Tx } from '@ocs/db';
import type { Actor } from '@ocs/contracts';
import type { PermissionKey } from './permissions.ts';

export interface CommandContext {
  /** The command's transaction, already scoped to the actor by RLS. Pass it to repositories. */
  readonly tx: Tx;
  readonly actor: Actor;
  /** One timestamp for the whole command (fake clock in tests). */
  readonly now: Date;
  newId(): string;
  /** Queue a domain event; written to the outbox in the same transaction. */
  emit(type: string, payload: Record<string, unknown>, clientId?: string | null): void;
}

export interface QueryContext {
  readonly tx: Tx;
  readonly actor: Actor;
  readonly now: Date;
}

/** What a command reports back for its audit record. Exactly one per command. */
export interface AuditEntry {
  readonly objectType: string;
  readonly objectId: string;
  /** The client the object belongs to, or null for internal-only objects. */
  readonly clientId: string | null;
  readonly before: unknown;
  readonly after: unknown;
}

export interface CommandOutcome<R> {
  readonly result: R;
  readonly audit: AuditEntry;
}

export interface CommandDefinition<S extends z.ZodType, R> {
  /** Stable name, recorded in audit, e.g. "cases.workItem.setEta". */
  readonly name: string;
  readonly permission: PermissionKey;
  readonly input: S;
  /** Human-readable audit description in English. */
  readonly describe: (input: z.output<S>) => string;
  readonly handle: (ctx: CommandContext, input: z.output<S>) => Promise<CommandOutcome<R>>;
}

export interface QueryDefinition<S extends z.ZodType, R> {
  readonly name: string;
  readonly permission: PermissionKey;
  readonly input: S;
  readonly handle: (ctx: QueryContext, input: z.output<S>) => Promise<R>;
}

export type Command<S extends z.ZodType = z.ZodType, R = unknown> = CommandDefinition<S, R> & {
  readonly kind: 'command';
};
export type Query<S extends z.ZodType = z.ZodType, R = unknown> = QueryDefinition<S, R> & {
  readonly kind: 'query';
};

export function defineCommand<S extends z.ZodType, R>(definition: CommandDefinition<S, R>): Command<S, R> {
  return Object.freeze({ ...definition, kind: 'command' as const });
}

export function defineQuery<S extends z.ZodType, R>(definition: QueryDefinition<S, R>): Query<S, R> {
  return Object.freeze({ ...definition, kind: 'query' as const });
}
