// Plain SQL migrations with up and down files (04-testing §3: up, down, up again).
// Files: migrations/NNNN_name.up.sql + NNNN_name.down.sql. Applied in name order, each in its own
// transaction, under an advisory lock so two deploys cannot migrate at once.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const LOCK_KEY = 7_203_115; // arbitrary, stable

export interface Migration {
  readonly name: string;
  readonly up: string;
  readonly down: string;
}

export function listMigrations(dir = MIGRATIONS_DIR): Migration[] {
  const names = readdirSync(dir)
    .filter((f) => f.endsWith('.up.sql'))
    .map((f) => f.slice(0, -'.up.sql'.length))
    .sort();
  return names.map((name) => ({
    name,
    up: readFileSync(`${dir}/${name}.up.sql`, 'utf8'),
    down: readFileSync(`${dir}/${name}.down.sql`, 'utf8'),
  }));
}

async function withLock<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS migrations;
       CREATE TABLE IF NOT EXISTS migrations.applied (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    return await fn(client);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}

async function applied(client: pg.PoolClient): Promise<string[]> {
  const res = await client.query<{ name: string }>('SELECT name FROM migrations.applied ORDER BY name');
  return res.rows.map((r) => r.name);
}

async function inTransaction(client: pg.PoolClient, fn: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    await fn();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

/** Applies pending migrations; returns the names applied. */
export async function migrateUp(pool: pg.Pool, migrations = listMigrations()): Promise<string[]> {
  return withLock(pool, async (client) => {
    const done = new Set(await applied(client));
    const pending = migrations.filter((m) => !done.has(m.name));
    for (const m of pending) {
      await inTransaction(client, async () => {
        await client.query(m.up);
        await client.query('INSERT INTO migrations.applied (name) VALUES ($1)', [m.name]);
      });
    }
    return pending.map((m) => m.name);
  });
}

/** Reverts the last `steps` applied migrations; returns the names reverted. */
export async function migrateDown(
  pool: pg.Pool,
  steps = 1,
  migrations = listMigrations(),
): Promise<string[]> {
  return withLock(pool, async (client) => {
    const byName = new Map(migrations.map((m) => [m.name, m]));
    const toRevert = (await applied(client)).reverse().slice(0, steps);
    for (const name of toRevert) {
      const m = byName.get(name);
      if (!m) throw new Error(`Applied migration ${name} has no files`);
      await inTransaction(client, async () => {
        await client.query(m.down);
        await client.query('DELETE FROM migrations.applied WHERE name = $1', [name]);
      });
    }
    return toRevert;
  });
}
