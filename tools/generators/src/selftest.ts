// F0.10 acceptance: every generator's output passes `pnpm verify` unchanged. Generates a throw-away module
// with a command, a query and a rule, and a client-data table migration; runs verify and the permission
// matrix, then puts the tree back exactly as it was (it starts clean).
// Needs a clean working tree (CI checkout, or commit/stash first) and Docker for the integration tests.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { generate, repoRoot } from './cli.ts';

const git = (...args: string[]) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

if (git('status', '--porcelain').trim() !== '') {
  console.error('gen:selftest needs a clean working tree: commit or stash your changes first.');
  process.exit(1);
}

const runs = [
  ['module', 'genprobe', 'Generator self-test module (never committed)'],
  ['command', 'genprobe', 'close-probe', '--roles', 'pm'],
  ['query', 'genprobe', 'probe-list', '--roles', 'pm,director'],
  ['rule', 'genprobe', 'probe-limit', '--cite', 'SOP-DEL-01 §8', '--sop-version', '1.3'],
  ['migration', 'add-genprobe-note', '--table', 'genprobe-note'],
];

try {
  for (const argv of runs) generate(argv);
  execFileSync('pnpm', ['verify'], { cwd: repoRoot, stdio: 'inherit' });
  execFileSync('pnpm', ['test:matrix'], { cwd: repoRoot, stdio: 'inherit' });
  console.log('\ngen:selftest: generated module, command, query, rule and migration pass verify unchanged.');
} finally {
  // Also after a failure half-way: every change since the clean start is generator output.
  git('checkout', '--', '.');
  for (const file of git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)) {
    rmSync(path.join(repoRoot, file), { force: true });
  }
  rmSync(path.join(repoRoot, 'packages/core/genprobe'), { recursive: true, force: true });
}
