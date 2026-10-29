// F0.7 acceptance: "a sample command cannot compile without permission key and schema".
// Each @ts-expect-error below must be a real compile error — if a line ever compiles, `tsc` fails
// with "Unused '@ts-expect-error' directive" and the typecheck task goes red.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand, defineQuery, permission, registeredPermissions } from '../index.ts';

const canCreate = permission('probe.note.create');
const input = z.object({ body: z.string().min(1) });
const handle = () =>
  Promise.resolve({
    result: 'id',
    audit: { objectType: 'probe', objectId: 'id', clientId: null, before: null, after: null },
  });

describe('defineCommand', () => {
  it('accepts a command with permission key, input schema and audit description', () => {
    const cmd = defineCommand({
      name: 'probe.note.create',
      permission: canCreate,
      input,
      describe: (i) => `Create note (${String(i.body.length)} chars)`,
      handle,
    });
    expect(cmd.kind).toBe('command');
    expect(Object.isFrozen(cmd)).toBe(true);
  });

  it('refuses at compile time a command without a permission key', () => {
    // @ts-expect-error — permission is required
    defineCommand({ name: 'x', input, describe: () => 'x', handle });
  });

  it('refuses at compile time a raw string instead of a registered permission key', () => {
    // @ts-expect-error — only permission() produces a PermissionKey
    defineCommand({ name: 'x', permission: 'probe.note.create', input, describe: () => 'x', handle });
  });

  it('refuses at compile time a command without an input schema', () => {
    // @ts-expect-error — input schema is required
    defineCommand({ name: 'x', permission: canCreate, describe: () => 'x', handle });
  });

  it('refuses at compile time a command without an audit description', () => {
    // @ts-expect-error — describe is required
    defineCommand({ name: 'x', permission: canCreate, input, handle });
  });

  it('refuses at compile time a handler that does not report its audit entry', () => {
    defineCommand({
      name: 'x',
      permission: canCreate,
      input,
      describe: () => 'x',
      // @ts-expect-error — the outcome must include `audit`
      handle: () => Promise.resolve({ result: 'id' }),
    });
  });
});

describe('defineQuery', () => {
  it('refuses at compile time a query without a permission key', () => {
    // @ts-expect-error — permission is required
    defineQuery({ name: 'x', input, handle: () => Promise.resolve(1) });
  });
});

describe('permission()', () => {
  it('registers keys for the permission matrix', () => {
    expect(registeredPermissions()).toContain('probe.note.create');
  });

  it('rejects keys that are not <module>.<object>.<action>', () => {
    // @ts-expect-error — needs at least three dot-separated parts
    expect(() => permission('probe.create')).toThrow();
    expect(() => permission('Probe.Note.Create')).toThrow(/camelCase/);
  });
});
