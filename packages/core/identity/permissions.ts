// Identity permissions (F0.8). Protected module: changes need the architect role.
import { permission } from '../kernel/index.ts';

export const identityPermissions = {
  inviteUser: permission('identity.user.invite', {
    description: 'Invite a new staff user by link',
    roles: ['admin', 'director'],
  }),
  readUsers: permission('identity.user.read', {
    description: 'See the user list with roles and MFA status',
    roles: ['admin', 'director'],
  }),
  assignRoles: permission('identity.user.assignRoles', {
    description: 'Grant or remove roles of a user',
    roles: ['admin'],
  }),
  archiveUser: permission('identity.user.archive', {
    description: 'Archive (deactivate) a user — never delete',
    roles: ['admin'],
  }),
  acceptInvitation: permission('identity.invitation.accept', {
    description: 'Grant the invited roles once the invited person has set a password (system only)',
    roles: ['system'],
  }),
  readInvitationByToken: permission('identity.invitation.readByToken', {
    description: 'Look up an open invitation by its link token (system only)',
    roles: ['system'],
  }),
  bootstrapAdmin: permission('identity.invitation.bootstrapAdmin', {
    description: 'Invite the first admin while no user exists (system only, installation)',
    roles: ['system'],
  }),
  readSelf: permission('identity.self.read', {
    description: 'See own profile, roles and sessions',
    roles: [
      'director',
      'pm',
      'sales',
      'rnd',
      'finance',
      'management',
      'sponsor',
      'admin',
      'client',
      'partner',
    ],
  }),
};
