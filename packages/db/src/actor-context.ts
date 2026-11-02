import { sql } from 'drizzle-orm';
import type { Db, Tx } from './client.ts';
import type { ActorKind } from './schema.ts';

/** What the database needs to know about the actor for row-level security (02-architecture §4). */
export interface DbActor {
  readonly id: string;
  readonly kind: ActorKind;
  readonly clientIds: readonly string[];
  /** Staff roles; policies that need them (restricted notes, D-28) deny when absent. */
  readonly roles?: readonly string[];
}

/**
 * Runs `fn` in one transaction as `actor`: switches to the ocs_app role (so RLS applies whatever the
 * login role is) and sets the actor context the policies read. Nothing else may open transactions on
 * business tables.
 */
export async function inActorTransaction<T>(
  db: Db,
  actor: DbActor,
  fn: (tx: Tx) => Promise<T>,
  options: { readOnly?: boolean } = {},
): Promise<T> {
  return db.transaction(
    async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE ocs_app`);
      await tx.execute(
        sql`SELECT set_config('app.actor_id', ${actor.id}, true),
                   set_config('app.actor_kind', ${actor.kind}, true),
                   set_config('app.client_ids', ${`{${actor.clientIds.join(',')}}`}, true),
                   set_config('app.roles', ${`{${(actor.roles ?? []).join(',')}}`}, true)`,
      );
      return fn(tx);
    },
    options.readOnly ? { accessMode: 'read only' } : {},
  );
}
