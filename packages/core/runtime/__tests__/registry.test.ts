// D-33: the registry every AI platform is offered. CI fails when an operation is missing from it, has no
// AI-usable description, or its input cannot become a JSON Schema.
import { describe, expect, it } from 'vitest';
import '../../permissions/index.ts';
import { registeredPermissions } from '../../kernel/index.ts';
import { offeredOperations, operations, operationsFor } from '../registry.ts';

/** Permissions held by no command or query yet (reserved keys); keep this list short and explained. */
const WITHOUT_OPERATION = new Set<string>([
  // Identity admin screens (F0.8) not built yet; assignRoles is also the policy invite-user checks.
  'identity.user.read',
  'identity.user.assignRoles',
  'identity.user.archive',
]);

describe('operation registry (D-33)', () => {
  it('holds every command and query: each registered permission has its operation', () => {
    const held = new Set(operations().map((o) => o.operation.permission as string));
    const missing = registeredPermissions()
      .map((p) => p.key)
      .filter((k) => !held.has(k) && !WITHOUT_OPERATION.has(k));
    expect(missing).toEqual([]);
  });

  it('names are unique', () => {
    const names = operations().map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every operation has a description an AI can use: a sentence, not a key', () => {
    const weak = operations().filter((o) => o.description.trim().length < 20 || !/\s/.test(o.description));
    expect(weak.map((o) => o.name)).toEqual([]);
  });

  it('every input is an object JSON Schema', () => {
    const notObject = operations().filter((o) => o.inputSchema.type !== 'object');
    expect(notObject.map((o) => o.name)).toEqual([]);
  });

  it('an agent gets only what its person may do — never system-only operations', () => {
    const sales = operationsFor({ roles: ['sales'] }).map((o) => o.name);
    expect(sales).toContain('intake.handoverCard.save');
    expect(sales).not.toContain('intake.review.decide');
    expect(sales).not.toContain('devices.platform.syncDevices');
    const all = operationsFor({
      roles: ['director', 'sponsor', 'pm', 'sales', 'management', 'admin', 'system'],
    });
    expect(all.filter((o) => o.roles.every((r) => r === 'system'))).toEqual([]);
  });

  it('the public catalogue (OpenAPI) offers no system-only or flow-step operation', () => {
    const names = offeredOperations().map((o) => o.name);
    expect(names).toContain('intake.handoverCard.save');
    expect(names).not.toContain('devices.platform.syncDevices');
  });
});
