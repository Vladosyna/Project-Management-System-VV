// F0.10 acceptance: every generator's output passes `pnpm verify` unchanged. Generates a throw-away module
// with a command, a query and a rule, and a screen; runs verify, the permission matrix and the browser
// e2e; then restores exactly the files it touched. Needs a clean working tree (CI checkout, or commit or
// stash first), Docker for the integration tests and Chromium for Playwright.
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
  ['screen', 'genprobe-board', '--title', 'Generator probe', '--title-zh', '生成器测试'],
];
const touched = new Set<string>();

try {
  for (const argv of runs) for (const file of generate(argv)) touched.add(file);
  for (const script of ['verify', 'test:matrix', 'e2e']) {
    execFileSync('pnpm', [script], { cwd: repoRoot, stdio: 'inherit' });
  }
  console.log(
    '\ngen:selftest: generated module, command, query, rule and screen pass verify and e2e unchanged.',
  );
} finally {
  const tracked = new Set(git('ls-files').split('\n'));
  for (const file of touched) {
    if (tracked.has(file)) git('checkout', '--', file);
    else rmSync(path.join(repoRoot, file), { force: true });
  }
  rmSync(path.join(repoRoot, 'packages/core/genprobe'), { recursive: true, force: true });
}
