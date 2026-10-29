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
        await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await c.end();
      }
    },
  };
}
