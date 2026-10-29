// CLAUDE.md §3 rule 3: no real client, partner or person names in code, seeds, fixtures or tests.
// The names to look for live in docs/ocs/domain/real-names-denylist.txt (docs may hold real names).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCANNED = ['apps', 'packages', 'tools'];
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.turbo',
  'playwright-report',
  'test-results',
]);
const EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|sql|fixture|md|css|html)$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return SKIP_DIRS.has(name) ? [] : files(full);
    return EXTENSIONS.test(name) ? [full] : [];
  });
}

const denylist = readFileSync(path.join(root, 'docs/ocs/domain/real-names-denylist.txt'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const patterns = denylist.map((name) => ({
  name,
  re: new RegExp(`(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu'),
}));

it('the denylist is loaded', () => {
  expect(denylist.length).toBeGreaterThan(10);
});

it('no real client, partner or person name appears in apps/, packages/ or tools/', () => {
  const hits: string[] = [];
  for (const file of SCANNED.flatMap((d) => files(path.join(root, d)))) {
    const text = readFileSync(file, 'utf8');
    for (const { name, re } of patterns) {
      if (re.test(text)) hits.push(`${path.relative(root, file)}: "${name}"`);
    }
  }
  expect(hits).toEqual([]);
});
