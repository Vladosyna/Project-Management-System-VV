// Typed domain errors (03-engineering-rules §5). The API maps each `code` to an HTTP status.
// Never throw plain Error from business logic and never swallow these.

export type DomainErrorCode = 'not_found' | 'forbidden' | 'rule_violation' | 'conflict' | 'validation_failed';

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
}

export class NotFound extends DomainError {
  readonly code = 'not_found';
  constructor(
    readonly entity: string,
    readonly id: string,
  ) {
    super(`${entity} ${id} not found`);
  }
}

export class Forbidden extends DomainError {
  readonly code = 'forbidden';
  constructor(readonly permission: string) {
    super(`Missing permission: ${permission}`);
  }
}

/** A business rule refused the operation. `clause` cites the SOP, e.g. "SOP-DEL-01 §8". */
export class RuleViolation extends DomainError {
  readonly code = 'rule_violation';
  constructor(
    readonly clause: string,
    message: string,
  ) {
    super(`Blocked by ${clause}: ${message}`);
  }
}

export class Conflict extends DomainError {
  readonly code = 'conflict';
}

export class ValidationFailed extends DomainError {
  readonly code = 'validation_failed';
  constructor(readonly issues: readonly { path: string; message: string }[]) {
    super(`Validation failed: ${issues.map((i) => `${i.path} ${i.message}`).join('; ')}`);
  }
}
