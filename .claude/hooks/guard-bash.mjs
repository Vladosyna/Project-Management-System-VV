// PreToolUse(Bash): block dangerous or rule-breaking shell commands.
import { readInput, projectDir, currentBranch, isArchBranch, PROTECTED_PREFIXES, block } from './lib.mjs';

const input = await readInput();
const cmd = String((input.tool_input || {}).command || '');
if (!cmd) process.exit(0);
const dir = projectDir(input);
const branch = currentBranch(dir);
const arch = isArchBranch(branch);

const rules = [
  [/\bgit\s+push\b[^\n;&|]*(\s--force(-with-lease)?\b|\s-f\b)/, 'Force push is forbidden.'],
  [/\bgit\s+push\b[^\n;&|]*[\s:](main|master)(\s|$|;|&|\|)/, 'Pushing to main is forbidden. Push your branch and open a PR.'],
  [/--no-verify\b/, 'Skipping git hooks (--no-verify) is forbidden.'],
  [/\bgit\s+commit\b[^\n;&|]*\s-n\b/, 'Skipping git hooks (commit -n) is forbidden.'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard can destroy work. Ask the person first and explain what would be lost.'],
  [/\bgit\s+clean\s+-[a-z]*f/, 'git clean -f deletes untracked files. Ask the person first.'],
  [/\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+(\/|~|\$HOME|\.|\*)(\s|$)/, 'Recursive delete of a root, home or whole directory is forbidden.'],
  [/\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|node|python3?)\b/, 'Piping a download into a shell is forbidden.'],
  [/\b(npm|pnpm|yarn)\s+publish\b/, 'Publishing packages is forbidden.'],
  [/\bdrizzle-kit\s+push\b/, 'drizzle-kit push bypasses migrations. Use pnpm gen:migration on an arch/ branch.'],
  [/(PROD|PRODUCTION)_DATABASE_URL|--env[= ]prod(uction)?\b|\bpsql\b[^\n]*prod/i, 'Production access from a development session is forbidden. Data fixes go through audited commands.'],
  [/\bgit\s+config\b[^\n]*core\.hooksPath/, 'Changing git hooks path is forbidden.'],
];
for (const [re, msg] of rules) if (re.test(cmd)) block(msg);

if (/\bgit\s+commit\b/.test(cmd) && ['main', 'master'].includes(branch)) {
  block('Do not commit on main. Create a branch: feat/<module>-<short>, fix/..., or arch/... for protected zones.');
}

if (!arch) {
  if (/\b(pnpm|yarn)\s+add\b|\bnpm\s+(install|i)\s+(?!-)[@a-z0-9]/i.test(cmd)) {
    block('Adding dependencies changes package.json (protected). Propose it to the person; it is done on an arch/ branch with architect review.');
  }
  const writes = /(\bsed\s+-i\b|>>?|\btee\b|\bmv\b|\bcp\b|\brm\b|\btruncate\b|\bchmod\b|\bln\b)/;
  const touchesProtected = PROTECTED_PREFIXES.some((p) => cmd.includes(p)) || /\bCLAUDE\.md\b|package\.json|01-decisions\.md|pnpm-lock\.yaml/.test(cmd);
  if (writes.test(cmd) && touchesProtected) {
    block('This shell command appears to modify a protected zone outside an arch/ branch. Use normal edits on an arch/ branch with review.');
  }
}
process.exit(0);
