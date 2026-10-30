// Shared helpers for OCS Claude Code hooks. Exit code 2 = block; stderr goes back to Claude.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

export async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

export function currentBranch(dir) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

export const isArchBranch = (b) => b.startsWith('arch/');

// Protected zones (CLAUDE.md §6). Paths are repo-relative, POSIX separators. .github/CODEOWNERS must list
// exactly the same paths — selftest.mjs fails when the two disagree.
export const PROTECTED_PREFIXES = [
  'packages/db/',
  'packages/core/kernel/',
  'packages/core/runtime/',
  'packages/core/identity/',
  'packages/core/permissions/',
  'packages/contracts/',
  'infra/',
  '.github/',
  '.claude/',
  'docs/ocs/adr/',
  'tools/eslint-plugin/',
  'tools/ci/',
  'tools/generators/',
];
export const PROTECTED_FILES = [
  'CLAUDE.md',
  'docs/ocs/01-decisions.md',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'tsconfig.paths.json',
  'eslint.config.js',
];
export const PROTECTED_BASENAMES = ['package.json'];

export function relPath(dir, file) {
  const abs = path.resolve(dir, file);
  return path.relative(dir, abs).split(path.sep).join('/');
}

export function isOutside(rel) {
  return rel.startsWith('../') || rel === '..' || path.isAbsolute(rel);
}

export function isTempPath(file) {
  const abs = path.resolve(file);
  return [os.tmpdir(), '/tmp'].some((t) => abs === t || abs.startsWith(t + path.sep));
}

export function isProtected(rel) {
  if (PROTECTED_FILES.includes(rel)) return true;
  if (PROTECTED_BASENAMES.includes(path.posix.basename(rel))) return true;
  return PROTECTED_PREFIXES.some((p) => rel === p.slice(0, -1) || rel.startsWith(p));
}

export function block(message) {
  process.stderr.write(`[OCS guard] ${message}\n`);
  process.exit(2);
}
