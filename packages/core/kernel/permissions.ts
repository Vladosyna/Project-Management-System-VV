// Permission keys and the checker the kernel calls before every command and query (deny by default).
// The role → permission map lives in core/permissions (protected); the kernel only knows the interface.
import type { Actor } from '@ocs/contracts';

declare const permissionBrand: unique symbol;

/** A registered permission key, `<module>.<object>.<action>`. Only `permission()` produces one. */
export type PermissionKey = string & { readonly [permissionBrand]: true };

const registry = new Set<string>();

/** Registers a permission key. Modules call this in their permissions.ts. */
export function permission(key: `${string}.${string}.${string}`): PermissionKey {
  if (!/^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*){2,}$/.test(key)) {
    throw new Error(`Invalid permission key "${key}": use <module>.<object>.<action> in camelCase`);
  }
  registry.add(key);
  return key as PermissionKey;
}

/** All registered keys — source for the permission matrix suite (04-testing §3). */
export function registeredPermissions(): readonly string[] {
  return [...registry].sort();
}

export interface PermissionChecker {
  has(actor: Actor, key: PermissionKey): boolean | Promise<boolean>;
}

/** Grants nothing. The default until identity/permissions (F0.8) provides the real checker. */
export const denyAll: PermissionChecker = { has: () => false };
