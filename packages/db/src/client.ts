import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface Database {
  readonly db: Db;
  readonly pool: pg.Pool;
  close(): Promise<void>;
}

/** Opens a pool. The login role must be a member of ocs_app; credentials come from the environment only. */
export function createDatabase(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString, max: 10 });
  return {
    db: drizzle(pool, { schema }),
    pool,
    close: () => pool.end(),
  };
}

/**
 * Pool for better-auth (identity). Every connection runs as role ocs_auth with search_path auth, so the
 * login tables are reachable only through it and business tables not at all — whatever the login role.
 */
export function createAuthPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 5, options: '-c role=ocs_auth -c search_path=auth' });
}
