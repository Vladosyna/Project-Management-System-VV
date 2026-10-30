// Installation step: prints a one-time invitation link for the first admin. Refused once any user exists.
// Usage: pnpm --filter @ocs/api bootstrap-admin <email>   (environment as for the server)
import { bootstrapAdmin } from '@ocs/core/identity';
import { systemActor } from '@ocs/core/kernel';
import { createRuntime, migrateDatabase } from '@ocs/core/runtime';

const email = process.argv[2];
const env = (name: string) => process.env[name] ?? '';
if (!email || !env('OCS_DATABASE_URL') || !env('OCS_AUTH_SECRET') || !env('OCS_PUBLIC_URL')) {
  console.error('usage: OCS_DATABASE_URL=… OCS_AUTH_SECRET=… OCS_PUBLIC_URL=… bootstrap-admin <email>');
  process.exit(2);
}

await migrateDatabase(env('OCS_DATABASE_URL'));
const runtime = createRuntime({
  databaseUrl: env('OCS_DATABASE_URL'),
  auth: { secret: env('OCS_AUTH_SECRET'), baseURL: env('OCS_PUBLIC_URL') },
});
try {
  const invite = await runtime.kernel.execute(bootstrapAdmin, systemActor('install'), { email }, 'system');
  console.log(`First admin invitation (valid until ${invite.expiresAt.toISOString()}), open once:`);
  console.log(`${env('OCS_PUBLIC_URL')}/accept-invitation#${invite.token}`);
} finally {
  await runtime.close();
}
