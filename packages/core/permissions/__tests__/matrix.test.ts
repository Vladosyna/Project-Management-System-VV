// Permission matrix suite (04-testing §3): every role × every registered permission, deny by default.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { roles, type Actor, type Role } from '@ocs/contracts';
import { registeredPermissions, type PermissionKey } from '../../kernel/index.ts';
import '../all.ts';
import {
  createRoleChecker,
  effectiveRoles,
  EXTERNAL_ACCESS_ENABLED,
  renderPermissionMatrix,
} from '../index.ts';

const coreDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = path.resolve(coreDir, '../..');
const grants = registeredPermissions();
const checker = createRoleChecker();
const key = (k: string) => k as PermissionKey;

const kindOf = (role: Role): Actor['kind'] =>
  role === 'client' ? 'client' : role === 'partner' ? 'partner' : role === 'system' ? 'system' : 'staff';
const actorWith = (role: Role, kind = kindOf(role)): Actor => ({
  id: '00000000-0000-4000-8000-000000000001',
  kind,
  clientIds: [],
  roles: [role],
});

describe('registry', () => {
  it('every core module is loaded by permissions/all.ts', () => {
    const modules = readdirSync(coreDir).filter(
      (d) =>
        !d.startsWith('.') &&
        statSync(path.join(coreDir, d)).isDirectory() &&
        !['kernel', 'permissions', 'runtime', 'node_modules'].includes(d),
    );
    const all = readFileSync(path.join(coreDir, 'permissions/all.ts'), 'utf8');
    const missing = modules.filter((m) => !all.includes(`'../${m}/index.ts'`));
    expect(missing).toEqual([]);
  });

  it('docs/ocs/permission-matrix.md matches the code (run `pnpm gen:matrix` after changing a permission)', () => {
    const committed = readFileSync(path.join(repoRoot, 'docs/ocs/permission-matrix.md'), 'utf8');
    expect(committed).toBe(renderPermissionMatrix(grants));
  });

  it('has permissions to check', () => {
    expect(grants.length).toBeGreaterThan(0);
  });
});

describe('role × permission', () => {
  const internalRoles = roles.filter((r) => r !== 'client' && r !== 'partner');
  for (const grant of grants) {
    for (const role of internalRoles) {
      const expected = grant.roles.includes(role);
      it(`${role} ${expected ? 'may' : 'may not'} ${grant.key}`, () => {
        expect(checker.has(actorWith(role), key(grant.key))).toBe(expected);
      });
    }
  }
});

describe('guards', () => {
  it('external access is switched off until the V1.1 security review', () => {
    expect(EXTERNAL_ACCESS_ENABLED).toBe(false);
    for (const grant of grants) {
      expect(checker.has(actorWith('client'), key(grant.key))).toBe(false);
      expect(checker.has(actorWith('partner'), key(grant.key))).toBe(false);
    }
  });

  it('when external access is on, a client actor gets exactly the client grants', () => {
    const open = createRoleChecker({ externalAccess: true });
    for (const grant of grants) {
      expect(open.has(actorWith('client'), key(grant.key))).toBe(grant.roles.includes('client'));
    }
  });

  it('a role that does not fit the actor kind is ignored (a staff account cannot act as a client, or vice versa)', () => {
    expect(effectiveRoles({ ...actorWith('admin'), kind: 'client' }, { externalAccess: true })).toEqual([]);
    expect(effectiveRoles({ ...actorWith('client'), kind: 'staff' })).toEqual([]);
    expect(effectiveRoles({ ...actorWith('admin'), kind: 'system' })).toEqual([]);
  });

  it('an unregistered key is denied to everyone', () => {
    for (const role of roles) expect(checker.has(actorWith(role), key('nobody.registered.this'))).toBe(false);
  });

  it('an actor without roles gets nothing', () => {
    expect(checker.has({ ...actorWith('admin'), roles: [] }, key('identity.user.invite'))).toBe(false);
  });
});
