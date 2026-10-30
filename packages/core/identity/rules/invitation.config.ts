// Invitation policy (D-10: accounts only by invitation). Internal security policy, not an SOP clause.
import type { Role } from '@ocs/contracts';

export const invitationPolicy = {
  /** An unused invitation link expires after this many days. */
  validDays: 7,
  /** Roles only an inviter who may assign roles (admin) can put on an invitation — stops privilege escalation. */
  elevatedRoles: ['admin', 'sponsor'] satisfies Role[] as readonly Role[],
} as const;
