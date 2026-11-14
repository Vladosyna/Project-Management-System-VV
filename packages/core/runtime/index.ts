// runtime — the composition root: database pools, kernel, permission checker, auth (protected).
// Apps (api, worker, mcp) start OCS only through createRuntime.
import { createAuthPool, createDatabase, migrateUp } from '@ocs/db';

/** Scheduled jobs for the worker (P-05, pg-boss). */
export { startScheduledJobs } from '@ocs/db';
export type { JobScheduler, ScheduledJob } from '@ocs/db';
import { createKernel, type Kernel } from '../kernel/index.ts';
import { createRoleChecker } from '../permissions/index.ts';
import { createAuth, createIdentityService, type Auth, type IdentityService } from '../identity/index.ts';

export interface RuntimeConfig {
  /** PostgreSQL URL from the environment / secret store. The login role must be a member of ocs_app and ocs_auth. */
  readonly databaseUrl: string;
  readonly auth: { readonly secret: string; readonly baseURL: string };
  readonly clock?: () => Date;
}

export interface Runtime {
  readonly kernel: Kernel;
  readonly auth: Auth;
  readonly identity: IdentityService;
  readonly baseURL: string;
  close(): Promise<void>;
}

export function createRuntime(config: RuntimeConfig): Runtime {
  const database = createDatabase(config.databaseUrl);
  const authPool = createAuthPool(config.databaseUrl);
  const kernel = createKernel({
    db: database.db,
    permissions: createRoleChecker(),
    ...(config.clock ? { clock: config.clock } : {}),
  });
  const auth = createAuth({ database: authPool, secret: config.auth.secret, baseURL: config.auth.baseURL });
  return {
    kernel,
    auth,
    identity: createIdentityService({ kernel, auth, db: database.db }),
    baseURL: config.auth.baseURL,
    close: async () => {
      await database.close();
      await authPool.end();
    },
  };
}

/** Applies pending migrations (deploy step and tests). Returns the names applied. */
export async function migrateDatabase(databaseUrl: string): Promise<string[]> {
  const database = createDatabase(databaseUrl);
  try {
    return await migrateUp(database.pool);
  } finally {
    await database.close();
  }
}
