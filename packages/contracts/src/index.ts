// @ocs/contracts — zod schemas and inferred types shared by web, api, mcp and worker [protected].
export { ActorSchema, CommandSourceSchema } from './actor.ts';
export type { Actor, CommandSource } from './actor.ts';
export { externalRoles, RoleSchema, roles, staffRoles, systemRoles } from './roles.ts';
export type { Role } from './roles.ts';
export { AcceptInvitationRequest, InviteUserRequest } from './identity.ts';
