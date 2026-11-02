// pnpm seed — loads the anonymised seed world into the database at OCS_DATABASE_URL (local development).
// Refuses a database that is not on this machine unless --allow-remote is given: the seed is test data and
// must never reach a shared or production database (CLAUDE.md §3 rule 3).
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { createRuntime, migrateDatabase } from '@ocs/core/runtime';
import { loadSeed } from './load.ts';

const { values } = parseArgs({ options: { 'allow-remote': { type: 'boolean', default: false } } });
const databaseUrl = process.env.OCS_DATABASE_URL ?? '';
if (!databaseUrl) throw new Error('Set OCS_DATABASE_URL to the local database to seed');
const host = new URL(databaseUrl).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host) && !values['allow-remote']) {
  throw new Error(`Refusing to seed ${host}: not a local database (use --allow-remote for a disposable one)`);
}

await migrateDatabase(databaseUrl);
const runtime = createRuntime({
  databaseUrl,
  auth: { secret: randomBytes(32).toString('hex'), baseURL: 'http://localhost' },
});
try {
  const summary = await loadSeed(runtime.kernel);
  console.log(
    `Seeded ${String(summary.clients)} clients, ${String(summary.sites)} sites, ${String(summary.partners)} partners.`,
  );
} finally {
  await runtime.close();
}
