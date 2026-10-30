// Starts PostgreSQL, migrates, invites the first admin, then the API and the web app on fixed ports.
// The invitation token reaches the tests through process.env (workers inherit it).
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapAdmin } from '@ocs/core/identity';
import { systemActor } from '@ocs/core/kernel';
import { createRuntime, migrateDatabase } from '@ocs/core/runtime';
import { createTestDatabase, startPostgresServer } from '@ocs/testing';
import { API_PORT, WEB_PORT } from './playwright.config.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const webOrigin = `http://localhost:${String(WEB_PORT)}`;
export const ADMIN_EMAIL = 'person01@example.test';

async function waitFor(url: string, child: ChildProcess): Promise<void> {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`${url}: process exited with ${String(child.exitCode)}`);
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`${url} did not start`);
}

function stop(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    child.once('exit', () => {
      resolve();
    });
    child.kill();
  });
}

function start(command: string, args: string[], env: Record<string, string>): ChildProcess {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return child;
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  const server = await startPostgresServer();
  const db = await createTestDatabase(server.url);
  await migrateDatabase(db.url);

  const auth = { secret: randomBytes(32).toString('hex'), baseURL: webOrigin };
  const runtime = createRuntime({ databaseUrl: db.url, auth });
  const invite = await runtime.kernel.execute(
    bootstrapAdmin,
    systemActor('e2e'),
    { email: ADMIN_EMAIL },
    'system',
  );
  await runtime.close();
  process.env.OCS_E2E_INVITE_TOKEN = invite.token;
  process.env.OCS_E2E_ADMIN_EMAIL = ADMIN_EMAIL;

  const tsx = path.join(root, 'node_modules/.bin/tsx');
  const api = start(tsx, ['apps/api/src/server.ts'], {
    OCS_DATABASE_URL: db.url,
    OCS_AUTH_SECRET: auth.secret,
    OCS_PUBLIC_URL: webOrigin,
    PORT: String(API_PORT),
  });
  const vite = path.join(root, 'apps/web/node_modules/.bin/vite');
  const web = start(vite, ['--config', 'apps/web/vite.config.ts', 'apps/web'], {
    OCS_API_URL: `http://localhost:${String(API_PORT)}`,
    PORT: String(WEB_PORT),
  });
  await waitFor(`http://localhost:${String(API_PORT)}/api/me`, api);
  await waitFor(webOrigin, web);

  return async () => {
    await Promise.all([stop(web), stop(api)]); // before dropping the database the API is connected to
    await db.drop();
    await server.stop();
  };
}
