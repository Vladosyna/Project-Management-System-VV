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
// D-33: set once an admin has created the MCP resource client (Admin screen); the secret lives in the secret store.
const introspectionId = process.env.OCS_MCP_INTROSPECTION_CLIENT_ID;
const introspectionSecret = process.env.OCS_MCP_INTROSPECTION_CLIENT_SECRET;
const introspection =
  introspectionId && introspectionSecret
    ? { clientId: introspectionId, clientSecret: introspectionSecret }
    : undefined;
if (!introspection) {
  console.warn(
    JSON.stringify({
      level: 'warn',
      msg: 'AI agent tokens checked without introspection: no audience check, agent name not in audit',
    }),
  );
}
const port = Number(process.env.PORT ?? '3000');
serve({ fetch: createApp(runtime, introspection ? { introspection } : {}).fetch, port });
console.log(JSON.stringify({ level: 'info', msg: 'api listening', port }));
