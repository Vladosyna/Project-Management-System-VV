// Typed domain errors (03-engineering-rules §5). The API maps each `code` to an HTTP status.
// Never throw plain Error from business logic and never swallow these.

export type DomainErrorCode = 'not_found' | 'forbidden' | 'rule_violation' | 'conflict' | 'validation_failed';

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
}

export class NotFound extends DomainError {
  readonly code = 'not_found';
  readonly entity: string;
  readonly id: string;
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.entity = entity;
    this.id = id;
  }
}

export class Forbidden extends DomainError {
  readonly code = 'forbidden';
  readonly permission: string;
  constructor(permission: string) {
    super(`Missing permission: ${permission}`);
    this.permission = permission;
  }
}

/** A business rule refused the operation. `clause` cites the SOP, e.g. "SOP-DEL-01 §8". */
export class RuleViolation extends DomainError {
  readonly code = 'rule_violation';
  readonly clause: string;
  constructor(clause: string, message: string) {
    super(`Blocked by ${clause}: ${message}`);
    this.clause = clause;
  }
}

export class Conflict extends DomainError {
  readonly code = 'conflict';
}

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class ValidationFailed extends DomainError {
  readonly code = 'validation_failed';
  readonly issues: readonly ValidationIssue[];
  constructor(issues: readonly ValidationIssue[]) {
    super(`Validation failed: ${issues.map((i) => `${i.path} ${i.message}`).join('; ')}`);
    this.issues = issues;
  }
}
