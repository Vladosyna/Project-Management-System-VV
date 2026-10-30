// The permission matrix: every registered permission × every role. Rendered into
// docs/ocs/permission-matrix.md by `pnpm gen:matrix`; a test fails when the file is stale.
import { roles, type Role } from '@ocs/contracts';
import type { PermissionGrant } from '../kernel/index.ts';

export function renderPermissionMatrix(
  grants: readonly PermissionGrant[],
  columns: readonly Role[] = roles,
): string {
  const header = `| Permission | What it allows | ${columns.join(' | ')} |`;
  const rule = `|---|---|${columns.map(() => ':-:').join('|')}|`;
  const rows = grants.map(
    (g) =>
      `| \`${g.key}\` | ${g.description} | ${columns.map((r) => (g.roles.includes(r) ? '✓' : '')).join(' | ')} |`,
  );
  return [
    '# Permission matrix (generated — do not edit)',
    '',
    'Generated from each module’s `permissions.ts` by `pnpm gen:matrix`. CI fails when this file and the code disagree.',
    'External roles (`client`, `partner`) are switched off in the checker until the V1.1 security review, whatever this table shows.',
    '',
    header,
    rule,
    ...rows,
    '',
  ].join('\n');
}
