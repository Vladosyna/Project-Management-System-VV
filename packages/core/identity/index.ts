// identity — users, roles, invitations, MFA, sessions (F0.8). Protected module.
export { identityPermissions } from './permissions.ts';
export { createAuth, invitationScope } from './auth.ts';
export type { Auth, AuthConfig } from './auth.ts';
export { createIdentityService } from './service.ts';
export type { IdentityService } from './service.ts';
export { inviteUser } from './commands/invite-user.ts';
export { bootstrapAdmin } from './commands/bootstrap-admin.ts';
export { acceptInvitation } from './commands/accept-invitation.ts';
export { invitationByToken } from './queries/invitation-by-token.ts';
export { me } from './queries/me.ts';
export type { AuthPool } from './repository.ts';
