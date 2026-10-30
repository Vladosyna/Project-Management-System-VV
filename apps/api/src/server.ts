// Starts the API. Configuration comes from the environment only (no secrets in code or files).
import { serve } from '@hono/node-server';
import { createRuntime } from '@ocs/core/runtime';
import { createApp } from './app.ts';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const runtime = createRuntime({
  databaseUrl: required('OCS_DATABASE_URL'),
  auth: { secret: required('OCS_AUTH_SECRET'), baseURL: required('OCS_PUBLIC_URL') },
});
const port = Number(process.env.PORT ?? '3000');
serve({ fetch: createApp(runtime).fetch, port });
console.log(JSON.stringify({ level: 'info', msg: 'api listening', port }));
