// Maps errors to HTTP. Domain errors keep their message and SOP clause; anything else becomes a bare 500
// (details stay in the server log, never in the response).
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { DomainError, RuleViolation, ValidationFailed } from '@ocs/core/kernel';

const statusOf: Record<DomainError['code'], ContentfulStatusCode> = {
  not_found: 404,
  forbidden: 403,
  rule_violation: 422,
  conflict: 409,
  validation_failed: 400,
};

export function errorResponse(err: unknown, c: Context): Response {
  if (err instanceof DomainError) {
    return c.json(
      {
        error: err.code,
        message: err.message,
        ...(err instanceof RuleViolation ? { clause: err.clause } : {}),
        ...(err instanceof ValidationFailed ? { issues: err.issues } : {}),
      },
      statusOf[err.code],
    );
  }
  if (isApiError(err)) {
    return c.json({ error: 'auth', message: err.message }, err.statusCode as ContentfulStatusCode);
  }
  console.error(JSON.stringify({ level: 'error', msg: 'unhandled', error: String(err) }));
  return c.json({ error: 'internal' }, 500);
}

function isApiError(err: unknown): err is { statusCode: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof err.statusCode === 'number' &&
    err.statusCode >= 400 &&
    err.statusCode < 500
  );
}
