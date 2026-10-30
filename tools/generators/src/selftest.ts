// F0.10 acceptance: every generator's output passes `pnpm verify` unchanged. Generates a throw-away module
// with a command, a query and a rule, a client-data table migration and a screen; runs verify, the
// permission matrix and the browser e2e; then puts the tree back exactly as it was (it starts clean).
// Needs a clean working tree (CI checkout, or commit or stash first), Docker for the integration tests
// and Chromium for Playwright.
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
  ['screen', 'genprobe-board', '--title', 'Generator probe', '--title-zh', '生成器测试'],
];

try {
  for (const argv of runs) generate(argv);
  for (const script of ['verify', 'test:matrix', 'e2e']) {
    execFileSync('pnpm', [script], { cwd: repoRoot, stdio: 'inherit' });
  }
  console.log(
    '\ngen:selftest: generated module, command, query, rule, migration and screen pass verify and e2e unchanged.',
  );
} finally {
  // Also after a failure half-way: every change since the clean start is generator output.
  git('checkout', '--', '.');
  for (const file of git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)) {
    rmSync(path.join(repoRoot, file), { force: true });
  }
  rmSync(path.join(repoRoot, 'packages/core/genprobe'), { recursive: true, force: true });
}
