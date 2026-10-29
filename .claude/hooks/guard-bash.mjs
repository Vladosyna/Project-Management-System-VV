// PreToolUse(Bash): block dangerous or rule-breaking shell commands.
import path from 'node:path';
import os from 'node:os';
import {
  readInput,
  projectDir,
  currentBranch,
  isArchBranch,
  relPath,
  isOutside,
  isProtected,
  block,
} from './lib.mjs';

const input = await readInput();
const cmd = String((input.tool_input || {}).command || '');
if (!cmd) process.exit(0);
const dir = projectDir(input);
const branch = currentBranch(dir);
const arch = isArchBranch(branch);

const rules = [
  [/\bgit\s+push\b[^\n;&|]*(\s--force(-with-lease)?\b|\s-f\b)/, 'Force push is forbidden.'],
  [
    /\bgit\s+push\b[^\n;&|]*[\s:](main|master)(\s|$|;|&|\|)/,
    'Pushing to main is forbidden. Push your branch and open a PR.',
  ],
  [/--no-verify\b/, 'Skipping git hooks (--no-verify) is forbidden.'],
  [/\bgit\s+commit\b[^\n;&|]*\s-n\b/, 'Skipping git hooks (commit -n) is forbidden.'],
  [
    /\bgit\s+reset\s+--hard\b/,
    'git reset --hard can destroy work. Ask the person first and explain what would be lost.',
  ],
  [/\bgit\s+clean\s+-[a-z]*f/, 'git clean -f deletes untracked files. Ask the person first.'],
  [
    /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+(\/|~|\$HOME|\.|\*)(\s|$)/,
    'Recursive delete of a root, home or whole directory is forbidden.',
  ],
  [
    /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|node|python3?)\b/,
    'Piping a download into a shell is forbidden.',
  ],
  [/\b(npm|pnpm|yarn)\s+publish\b/, 'Publishing packages is forbidden.'],
  [
    /\bdrizzle-kit\s+push\b/,
    'drizzle-kit push bypasses migrations. Use pnpm gen:migration on an arch/ branch.',
  ],
  [
    /(PROD|PRODUCTION)_DATABASE_URL|--env[= ]prod(uction)?\b|\bpsql\b[^\n]*prod/i,
    'Production access from a development session is forbidden. Data fixes go through audited commands.',
  ],
  [/\bgit\s+config\b[^\n]*core\.hooksPath/, 'Changing git hooks path is forbidden.'],
];
for (const [re, msg] of rules) if (re.test(cmd)) block(msg);

if (/\bgit\s+commit\b/.test(cmd) && ['main', 'master'].includes(branch)) {
  block(
    'Do not commit on main. Create a branch: feat/<module>-<short>, fix/..., or arch/... for protected zones.',
  );
}

if (!arch) {
  if (/\b(pnpm|yarn)\b[^\n;&|]*\sadd\s|\bnpm\s+(install|i)\s+(?!-)[@a-z0-9]/i.test(cmd)) {
    block(
      'Adding dependencies changes package.json (protected). Propose it to the person; it is done on an arch/ branch with architect review.',
    );
  }
  const target = writeTargets(cmd).find((t) => protectedPath(t));
  if (target) {
    block(
      `This shell command writes to "${target}", a protected zone, outside an arch/ branch. Use normal edits on an arch/ branch with review.`,
    );
  }
}
process.exit(0);

// --- write-target detection -------------------------------------------------
// Only the files a command actually writes are checked, so text that merely
// mentions a protected path (commit messages, `2>&1`, `~/.claude`) passes.

function protectedPath(p) {
  const expanded = p.replace(/^~(?=\/|$)/, os.homedir()).replace(/^\$HOME(?=\/|$)/, os.homedir());
  const rel = relPath(dir, path.resolve(dir, expanded));
  return !isOutside(rel) && isProtected(rel);
}

// Rough shell tokenizer: words with quotes removed, operators as separate tokens.
function tokenize(s) {
  const out = [];
  let cur = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" || c === '"') {
      const end = s.indexOf(c, i + 1);
      const stop = end === -1 ? s.length : end;
      cur = (cur ?? '') + s.slice(i + 1, stop);
      i = stop;
    } else if (c === '\\' && i + 1 < s.length) {
      cur = (cur ?? '') + s[++i];
    } else if (/\s/.test(c)) {
      if (cur !== null) (out.push(cur), (cur = null));
      if (c === '\n') out.push(';');
    } else if (';&|<>'.includes(c)) {
      if (cur !== null && !(c === '>' && /^\d$/.test(cur))) out.push(cur);
      cur = null;
      let op = c;
      while (i + 1 < s.length && ';&|<>'.includes(s[i + 1])) op += s[++i];
      out.push(op);
    } else {
      cur = (cur ?? '') + c;
    }
  }
  if (cur !== null) out.push(cur);
  return out;
}

function writeTargets(command) {
  const tokens = tokenize(command);
  const targets = [];
  // Redirections: `> file`, `>> file`, `&> file`; `>&` / `2>&1` duplicate a descriptor, not a file.
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^&?>>?$/.test(tokens[i])) targets.push(tokens[i + 1]);
  }
  // Commands that modify their file arguments.
  const segments = [];
  let seg = [];
  for (const t of tokens) {
    if (/^[;&|<>]+$/.test(t)) (segments.push(seg), (seg = []));
    else seg.push(t);
  }
  segments.push(seg);
  for (let s of segments) {
    while (s.length && (/^\w+=/.test(s[0]) || s[0] === 'sudo')) s = s.slice(1);
    const [name, ...args] = s;
    const files = args.filter((a) => !a.startsWith('-'));
    if (name === 'sed' && args.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith('--in-place'))) {
      targets.push(...files.slice(args.some((a) => a === '-e' || a === '-f') ? 0 : 1));
    } else if (['tee', 'rm', 'truncate', 'touch', 'unlink', 'rmdir'].includes(name)) {
      targets.push(...files);
    } else if (['mv', 'chmod', 'chown'].includes(name)) {
      targets.push(...(name === 'mv' ? files : files.slice(1)));
    } else if (['cp', 'ln', 'install'].includes(name)) {
      if (files.length) targets.push(files[files.length - 1]);
    }
  }
  return targets;
}
