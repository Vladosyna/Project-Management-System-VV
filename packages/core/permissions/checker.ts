// Role-based permission checker (deny by default). Protected module.
import { externalRoles, staffRoles, systemRoles, type Actor, type Role } from '@ocs/contracts';
import { grantOf, type PermissionChecker, type PermissionKey } from '../kernel/index.ts';

/**
 * External users (client, partner) get no permission at all until the independent security review of
 * identity, permissions and RLS is done (03-engineering-rules §7; client portal is V1.1). Turning this on
 * is an architect-role change with a decisions-log entry.
 */
export const EXTERNAL_ACCESS_ENABLED = false;

const rolesForKind: Record<Actor['kind'], readonly Role[]> = {
  staff: staffRoles,
  client: ['client'],
  partner: ['partner'],
  system: systemRoles,
};

/** The actor's roles that are valid for its kind — a staff account can never act as a client, and so on. */
export function effectiveRoles(actor: Actor, options = { externalAccess: EXTERNAL_ACCESS_ENABLED }): Role[] {
  if (!options.externalAccess && (externalRoles as readonly string[]).includes(actor.kind)) return [];
  const allowed = rolesForKind[actor.kind];
  return actor.roles.filter((r) => allowed.includes(r));
}

export function createRoleChecker(options = { externalAccess: EXTERNAL_ACCESS_ENABLED }): PermissionChecker {
  return {
    has(actor: Actor, key: PermissionKey): boolean {
      const grant = grantOf(key);
      if (!grant) return false;
      return effectiveRoles(actor, options).some((r) => grant.roles.includes(r));
    },
  };
}
