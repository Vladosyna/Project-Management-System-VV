// pnpm gen:<kind> … — see docs/ocs/03-engineering-rules.md §2 and the ocs-new-module / ocs-sop-rule skills.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { commandPlan, modulePlan, queryPlan, rulePlan } from './core.ts';
import { applyPlan, type Plan } from './plan.ts';
import { screenPlan } from './web.ts';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const USAGE = `Usage:
  pnpm gen:module <module> "<one-line purpose>"
  pnpm gen:command <module> <verb-noun> [--roles pm,director] [--description "…"] [--key m.object.action]
  pnpm gen:query <module> <noun> [--roles …] [--description "…"] [--key m.object.read]
  pnpm gen:rule <module> <rule-key> --cite "SOP-DEL-01 §8" --sop-version 1.3
  pnpm gen:screen <route> --title "Cases" --title-zh "案件"`;

export function planFor(argv: readonly string[]): Plan {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      roles: { type: 'string' },
      description: { type: 'string' },
      key: { type: 'string' },
      cite: { type: 'string' },
      'sop-version': { type: 'string' },
      title: { type: 'string' },
      'title-zh': { type: 'string' },
    },
  });
  // For `screen` the first argument is the route, not a module.
  const [kind, module = '', name = ''] = positionals;
  const access = {
    key: values.key,
    description: values.description,
    roles: values.roles
      ?.split(',')
      .map((r) => r.trim())
      .filter(Boolean),
  };
  switch (kind) {
    case 'module':
      return modulePlan(module, name);
    case 'command':
      return commandPlan(module, name, access);
    case 'query':
      return queryPlan(module, name, access);
    case 'screen':
      return screenPlan(module, values.title ?? '', values['title-zh'] ?? '');
    case 'rule':
      return rulePlan(module, name, values.cite ?? '', values['sop-version'] ?? '');
    default:
      throw new Error(USAGE);
  }
}

/** Generates, formats the touched files and refreshes the permission matrix. Returns the touched files. */
export function generate(argv: readonly string[]): string[] {
  const plan = planFor(argv);
  const touched = applyPlan(repoRoot, plan);
  const run = (args: string[]) => execFileSync('pnpm', args, { cwd: repoRoot, stdio: 'inherit' });
  run(['exec', 'prettier', '--write', '--log-level=warn', ...touched]);
  if (plan.permissionsChanged) {
    run(['gen:matrix']);
    touched.push('docs/ocs/permission-matrix.md');
  }
  console.log(
    ['', 'Written:', ...touched.map((f) => `  ${f}`), '', 'Next:', ...plan.next.map((n) => `  - ${n}`)].join(
      '\n',
    ),
  );
  return touched;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    generate(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
