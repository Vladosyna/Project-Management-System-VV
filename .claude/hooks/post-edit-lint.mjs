// PostToolUse(Edit|Write|MultiEdit): lint the edited file; report remaining errors back to Claude.
import { readInput, projectDir } from './lib.mjs';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const input = await readInput();
const file = (input.tool_input || {}).file_path;
if (!file || !/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) process.exit(0);
const dir = projectDir(input);
const eslint = path.join(dir, 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
if (!existsSync(eslint) || !existsSync(file)) process.exit(0);

const r = spawnSync(eslint, ['--fix', '--max-warnings=0', file], { cwd: dir, encoding: 'utf8', timeout: 80000 });
if (r.status && r.status !== 0) {
  const out = `${r.stdout || ''}${r.stderr || ''}`.split('\n').slice(-40).join('\n');
  process.stderr.write(`[OCS lint] ${path.relative(dir, file)} has lint errors after your edit. Fix them before continuing:\n${out}\n`);
  process.exit(2);
}
process.exit(0);
