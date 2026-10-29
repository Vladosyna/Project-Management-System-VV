// The one write path (02-architecture §3):
// permission → schema → transaction(as actor: handler incl. rules → audit → outbox) → result.
import type { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { auditEvent, inActorTransaction, outbox, type Db } from '@ocs/db';
import type { Actor, CommandSource } from '@ocs/contracts';
import type { Command, Query } from './define.ts';
import { Forbidden, ValidationFailed } from './errors.ts';
import type { PermissionChecker } from './permissions.ts';

export interface KernelDeps {
  readonly db: Db;
  readonly permissions: PermissionChecker;
  readonly clock?: () => Date;
  readonly newId?: () => string;
}

export interface Kernel {
  execute<S extends z.ZodType, R>(
    command: Command<S, R>,
    actor: Actor,
    input: unknown,
    source: CommandSource,
  ): Promise<R>;
  read<S extends z.ZodType, R>(query: Query<S, R>, actor: Actor, input: unknown): Promise<R>;
}

interface PendingEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  clientId: string | null;
}

export function createKernel(deps: KernelDeps): Kernel {
  const clock = deps.clock ?? (() => new Date());
  const newId = deps.newId ?? (() => uuidv7());

  async function authorise(actor: Actor, key: Command['permission']): Promise<void> {
    if (!(await deps.permissions.has(actor, key))) throw new Forbidden(key);
  }

  function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationFailed(
        parsed.error.issues.map((i) => ({ path: i.path.join('.') || '(input)', message: i.message })),
      );
    }
    return parsed.data;
  }

  return {
    async execute(command, actor, input, source) {
      await authorise(actor, command.permission);
      const data = parse(command.input, input);
      const now = clock();
      return inActorTransaction(deps.db, actor, async (tx) => {
        const events: PendingEvent[] = [];
        const outcome = await command.handle(
          {
            tx,
            actor,
            now,
            newId,
            emit: (eventType, payload, clientId = null) => {
              events.push({ id: newId(), eventType, payload, clientId });
            },
          },
          data,
        );
        await tx.insert(auditEvent).values({
          id: newId(),
          at: now,
          actorId: actor.id,
          actorKind: actor.kind,
          actorVia: actor.via ?? null,
          command: command.name,
          description: command.describe(data),
          objectType: outcome.audit.objectType,
          objectId: outcome.audit.objectId,
          clientId: outcome.audit.clientId,
          before: outcome.audit.before ?? null,
          after: outcome.audit.after ?? null,
          source,
        });
        if (events.length > 0) {
          await tx.insert(outbox).values(events.map((e) => ({ ...e, createdAt: now, availableAt: now })));
        }
        return outcome.result;
      });
    },

    async read(query, actor, input) {
      await authorise(actor, query.permission);
      const data = parse(query.input, input);
      const now = clock();
      return inActorTransaction(deps.db, actor, (tx) => query.handle({ tx, actor, now }, data), {
        readOnly: true,
      });
    },
  };
}
