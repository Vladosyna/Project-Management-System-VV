// pnpm gen:matrix — rewrites docs/ocs/permission-matrix.md from the permission registry.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import './all.ts';
import { registeredPermissions } from '../kernel/index.ts';
import { renderPermissionMatrix } from './matrix.ts';

const target = fileURLToPath(new URL('../../../docs/ocs/permission-matrix.md', import.meta.url));
writeFileSync(target, renderPermissionMatrix(registeredPermissions()));
console.log(`Wrote ${target} (${String(registeredPermissions().length)} permissions)`);
