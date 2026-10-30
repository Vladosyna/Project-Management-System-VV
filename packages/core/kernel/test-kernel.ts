// Tests only: a kernel on a freshly migrated database whose permission checker grants exactly what the
// test grants. Generated command and query tests use it (`pnpm gen:command`, `pnpm gen:query`).
import { createDatabase, migrateUp } from '@ocs/db';
import type { Actor } from '@ocs/contracts';
import { createKernel, type Kernel } from './kernel.ts';
import type { PermissionKey } from './permissions.ts';

export interface TestKernel {
  readonly kernel: Kernel;
  /** Lets this actor use these permissions; everyone else is denied (deny by default). */
  grant(actor: Actor, ...keys: PermissionKey[]): void;
  close(): Promise<void>;
}

/** `databaseUrl` is an empty test database, e.g. from @ocs/testing `createTestDatabase`. */
export async function openTestKernel(
  databaseUrl: string,
  options: { clock?: () => Date } = {},
): Promise<TestKernel> {
  const database = createDatabase(databaseUrl);
  await migrateUp(database.pool);
  const granted = new Map<string, Set<PermissionKey>>();
  const kernel = createKernel({
    db: database.db,
    permissions: { has: (actor, key) => granted.get(actor.id)?.has(key) ?? false },
    ...(options.clock ? { clock: options.clock } : {}),
  });
  return {
    kernel,
    grant: (actor, ...keys) => {
      const set = granted.get(actor.id) ?? new Set();
      for (const key of keys) set.add(key);
      granted.set(actor.id, set);
    },
    close: () => database.close(),
  };
}
