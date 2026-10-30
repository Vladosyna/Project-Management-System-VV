// permissions — role → permission checks and the permission matrix. Protected module.
// Importing this module loads every module's permissions, so the registry is complete.
import './all.ts';
export { createRoleChecker, effectiveRoles, EXTERNAL_ACCESS_ENABLED } from './checker.ts';
export { renderPermissionMatrix } from './matrix.ts';
