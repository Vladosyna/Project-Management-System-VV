// PreToolUse(Edit|Write|MultiEdit|NotebookEdit): protected zones only on arch/ branches; nothing outside the repo.
import { readInput, projectDir, currentBranch, isArchBranch, relPath, isOutside, isTempPath, isProtected, block } from './lib.mjs';

const input = await readInput();
const ti = input.tool_input || {};
const file = ti.file_path || ti.notebook_path || ti.path;
if (!file) process.exit(0);

const dir = projectDir(input);
const rel = relPath(dir, file);

if (isOutside(rel)) {
  if (isTempPath(file)) process.exit(0);
  block(`Write outside the repository is not allowed: ${file}. Work inside the project; ask Vlad if you really need this.`);
}

if (isProtected(rel)) {
  const branch = currentBranch(dir);
  if (!isArchBranch(branch)) {
    block(`"${rel}" is a protected zone (CLAUDE.md §6). Current branch "${branch || 'unknown'}" is not an arch/ branch. ` +
      `Stop. Explain to the person why this file needs to change; protected changes go through an arch/ branch and architect review.`);
  }
}
process.exit(0);
