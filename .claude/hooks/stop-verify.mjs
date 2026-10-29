// Stop: do not finish while the quick verification fails (evidence before "done").
import { readInput, projectDir } from './lib.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import path from 'node:path';

const input = await readInput();
if (input.stop_hook_active) process.exit(0); // avoid loops: second attempt is allowed through
const dir = projectDir(input);
const pkgPath = path.join(dir, 'package.json');
if (!existsSync(pkgPath)) process.exit(0);
let pkg = {};
try {
  pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
} catch {
  process.exit(0);
}
if (!pkg.scripts || !pkg.scripts['verify:quick']) process.exit(0);

let dirty = '';
try {
  dirty = execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' }).trim();
} catch {
  /* not a repo */
}
if (!dirty) process.exit(0); // nothing changed since last commit; CI covers commits

const r = spawnSync('pnpm', ['-s', 'verify:quick'], { cwd: dir, encoding: 'utf8', timeout: 570000 });
if (r.status !== 0) {
  const out = `${r.stdout || ''}${r.stderr || ''}`.split('\n').slice(-60).join('\n');
  process.stderr.write(
    `[OCS verify] pnpm verify:quick failed. Do not report the task as done. Fix, re-run, and show the evidence:\n${out}\n`,
  );
  process.exit(2);
}
process.exit(0);
