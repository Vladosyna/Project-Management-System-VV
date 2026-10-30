// A generator returns a plan; applyPlan checks every step before it writes anything, so a refused plan
// leaves the tree untouched.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type Change =
  /** A new file. Refused if it exists — generators never overwrite. */
  | { readonly kind: 'create'; readonly file: string; readonly content: string }
  /** Insert `text` before the line containing `marker`. Refused if the marker is missing. */
  | { readonly kind: 'insert'; readonly file: string; readonly marker: string; readonly text: string }
  /** Append `text` to the end of an existing file. */
  | { readonly kind: 'append'; readonly file: string; readonly text: string }
  /** Insert `line` (may span lines) before the first line starting with `before`, unless already there. */
  | { readonly kind: 'ensure'; readonly file: string; readonly line: string; readonly before: string };

export interface Plan {
  readonly changes: readonly Change[];
  /** Regenerate docs/ocs/permission-matrix.md afterwards. */
  readonly permissionsChanged: boolean;
  /** What the developer does next, printed after generating. */
  readonly next: readonly string[];
}

/** Applies the plan under `root` and returns the touched files (relative paths). */
export function applyPlan(root: string, plan: Plan): string[] {
  const files = new Map<string, string>();
  const read = (file: string): string => {
    const cached = files.get(file);
    if (cached !== undefined) return cached;
    const abs = path.join(root, file);
    if (!existsSync(abs)) throw new Error(`${file} does not exist`);
    return readFileSync(abs, 'utf8');
  };

  for (const change of plan.changes) {
    if (change.kind === 'create') {
      if (files.has(change.file) || existsSync(path.join(root, change.file))) {
        throw new Error(`${change.file} already exists — generators never overwrite`);
      }
      files.set(change.file, change.content);
      continue;
    }
    const lines = read(change.file).split('\n');
    if (change.kind === 'insert') {
      const at = lines.findIndex((l) => l.includes(change.marker));
      if (at < 0) throw new Error(`${change.file} has no "${change.marker}" line to insert at`);
      lines.splice(at, 0, ...change.text.split('\n'));
    } else if (change.kind === 'append') {
      while (lines.at(-1) === '') lines.pop();
      lines.push(...change.text.split('\n'), '');
    } else if (!lines.join('\n').includes(change.line)) {
      const at = lines.findIndex((l) => l.startsWith(change.before));
      if (at < 0) throw new Error(`${change.file} has no line starting with "${change.before}"`);
      lines.splice(at, 0, ...change.line.split('\n'));
    }
    files.set(change.file, lines.join('\n'));
  }

  for (const [file, content] of files) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return [...files.keys()];
}
