// Permission keys and the checker the kernel calls before every command and query (deny by default).
// Each module declares its keys in its permissions.ts together with the roles that hold them; the
// registry is the source of the permission matrix (core/permissions, docs/ocs/permission-matrix.md).
import type { Actor, Role } from '@ocs/contracts';

declare const permissionBrand: unique symbol;

/** A registered permission key, `<module>.<object>.<action>`. Only `permission()` produces one. */
export type PermissionKey = string & { readonly [permissionBrand]: true };

export interface PermissionGrant {
  readonly key: string;
  /** What the holder may do, in plain English — shown in the permission matrix. */
  readonly description: string;
  /** Roles that hold the permission. Empty = nobody yet (reserved). */
  readonly roles: readonly Role[];
}

const registry = new Map<string, PermissionGrant>();

/** Registers a permission key and the roles that hold it. Modules call this in their permissions.ts. */
export function permission(
  key: `${string}.${string}.${string}`,
  grant: { description: string; roles: readonly Role[] },
): PermissionKey {
  if (!/^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*){2,}$/.test(key)) {
    throw new Error(`Invalid permission key "${key}": use <module>.<object>.<action> in camelCase`);
  }
  const entry: PermissionGrant = {
    key,
    description: grant.description,
    roles: [...new Set(grant.roles)].sort(),
  };
  const existing = registry.get(key);
  if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) {
    throw new Error(`Permission "${key}" is registered twice with different grants`);
  }
  registry.set(key, entry);
  return key as PermissionKey;
}

/** All registered permissions, sorted by key — source for the permission matrix (04-testing §3). */
export function registeredPermissions(): readonly PermissionGrant[] {
  return [...registry.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** The grant behind a key, or undefined for a key nobody registered. */
export function grantOf(key: PermissionKey): PermissionGrant | undefined {
  return registry.get(key);
}

export interface PermissionChecker {
  has(actor: Actor, key: PermissionKey): boolean | Promise<boolean>;
}

/** Grants nothing. */
export const denyAll: PermissionChecker = { has: () => false };
