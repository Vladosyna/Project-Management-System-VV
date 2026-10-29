// Migrations that exist on the base branch are history: never edited, renamed or removed — add a new
// migration instead (ocs-db-migration skill). Usage: node tools/ci/migrations-immutable.mjs <base-ref>
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
if (!base) {
  console.error('usage: node tools/ci/migrations-immutable.mjs <base-ref>');
  process.exit(2);
}

const changes = execFileSync(
  'git',
  ['diff', '--name-status', '--find-renames', `${base}...HEAD`, '--', 'packages/db/migrations'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((line) => !line.startsWith('A\t'));

if (changes.length === 0) {
  console.log('Migrations: only new files added.');
  process.exit(0);
}
console.error('Existing migrations were changed. Add a new migration instead:');
for (const line of changes) console.error(`  ${line}`);
process.exit(1);
