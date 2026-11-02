// Real PostgreSQL for integration tests (04-testing §2). One server per test run, one fresh database
// per test file. Default: Testcontainers postgres:16-alpine. Set OCS_TEST_DATABASE_URL to use an existing
// server instead (it needs CREATEDB and CREATEROLE). Never point it at a database with real data.
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';

export const POSTGRES_IMAGE = 'postgres:16-alpine';

export interface PostgresServer {
  readonly url: string;
  stop(): Promise<void>;
}

export async function startPostgresServer(): Promise<PostgresServer> {
  const external = process.env.OCS_TEST_DATABASE_URL;
  if (external) return { url: external, stop: () => Promise.resolve() };
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  return {
    url: container.getConnectionUri(),
    stop: async () => {
      await container.stop();
    },
  };
}

export interface TestDatabase {
  readonly name: string;
  readonly url: string;
  drop(): Promise<void>;
}

const connectionsTo = async (c: pg.Client, database: string): Promise<number> =>
  (
    await c.query<{ n: number }>('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1', [
      database,
    ])
  ).rows[0]?.n ?? 0;

/** Creates an empty database on the server; `drop()` removes it. */
export async function createTestDatabase(serverUrl: string): Promise<TestDatabase> {
  const name = `ocs_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: serverUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  return {
    name,
    url: url.toString(),
    drop: async () => {
      const c = new pg.Client({ connectionString: serverUrl });
      await c.connect();
      try {
        // pg-pool's end() resolves before its connections have closed. Dropping WITH (FORCE) at that moment
        // kills a backend mid-goodbye, and its FATAL 57P01 reaches the closed pool as an uncaught error.
        // So wait (up to 1 s) for the database's own connections to go; FORCE only clears what is left.
        for (let i = 0; i < 50 && (await connectionsTo(c, name)) > 0; i++) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await c.end();
      }
    },
  };
}

/** Counts rows as the database owner (bypassing RLS) — for tests that check what was really stored. */
export async function countRows(databaseUrl: string, from: string, params: unknown[] = []): Promise<number> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const res = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${from}`, params);
    return res.rows[0]?.n ?? 0;
  } finally {
    await client.end();
  }
}

/** Runs one statement as the database owner — test set-up only, e.g. a state no command produces yet. */
export async function runAsOwner(
  databaseUrl: string,
  statement: string,
  params: unknown[] = [],
): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(statement, params);
  } finally {
    await client.end();
  }
}
