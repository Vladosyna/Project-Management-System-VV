// Kernel public API: domain errors now; defineCommand / defineQuery and actor context in F0.7.
export { DomainError, NotFound, Forbidden, RuleViolation, Conflict, ValidationFailed } from './errors';
export type { DomainErrorCode } from './errors';
