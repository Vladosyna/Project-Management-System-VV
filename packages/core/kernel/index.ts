// Kernel public API: the one write path, permission keys, domain errors.
export { defineCommand, defineQuery } from './define.ts';
export type {
  AuditEntry,
  Command,
  CommandContext,
  CommandDefinition,
  CommandOutcome,
  Query,
  QueryContext,
  QueryDefinition,
} from './define.ts';
export { createKernel } from './kernel.ts';
export type { Kernel, KernelDeps } from './kernel.ts';
export { denyAll, permission, registeredPermissions } from './permissions.ts';
export type { PermissionChecker, PermissionKey } from './permissions.ts';
export { DomainError, NotFound, Forbidden, RuleViolation, Conflict, ValidationFailed } from './errors.ts';
export type { DomainErrorCode, ValidationIssue } from './errors.ts';
