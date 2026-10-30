import { z } from 'zod';
import { staffRoles } from './roles.ts';

/** Invite a staff user (identity.user.invite). External users are invited from V1.1. */
export const InviteUserRequest = z.object({
  email: z.email().max(254),
  roles: z.array(z.enum(staffRoles)).min(1),
});
export type InviteUserRequest = z.infer<typeof InviteUserRequest>;

/** Accept an invitation: the token from the link, the person's name and a new password. */
export const AcceptInvitationRequest = z.object({
  token: z.string().min(20).max(200),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(128),
});
export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationRequest>;
