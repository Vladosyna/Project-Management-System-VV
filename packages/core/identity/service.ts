// Flows that span better-auth and the kernel. Each step that changes business data is an audited command.
import { APIError } from 'better-auth/api';
import { AcceptInvitationRequest, type Actor } from '@ocs/contracts';
import { systemActor, ValidationFailed, type Kernel } from '../kernel/index.ts';
import { invitationScope, type Auth } from './auth.ts';
import { acceptInvitation } from './commands/accept-invitation.ts';
import { invitationByToken } from './queries/invitation-by-token.ts';
import { loadActor } from './repository.ts';

type Db = Parameters<typeof loadActor>[0];

export interface IdentityService {
  /** Creates the invited person's account (email and kind come from the invitation) and grants its roles. */
  acceptInvitation(input: unknown, headers: Headers): Promise<{ userId: string; headers: Headers }>;
  /** The actor for a signed-in user, or undefined when archived or unknown. */
  loadActor(userId: string): Promise<Actor | undefined>;
}

export function createIdentityService(deps: { kernel: Kernel; auth: Auth; db: Db }): IdentityService {
  const actor = systemActor('identity');
  return {
    async acceptInvitation(input, headers) {
      const parsed = AcceptInvitationRequest.safeParse(input);
      if (!parsed.success) {
        throw new ValidationFailed(
          parsed.error.issues.map((i) => ({ path: i.path.join('.') || '(input)', message: i.message })),
        );
      }
      const req = parsed.data;
      const inv = await deps.kernel.read(invitationByToken, actor, { token: req.token });
      const account = await createOrResumeAccount(deps.auth, inv, req, headers);
      await deps.kernel.execute(
        acceptInvitation,
        actor,
        { invitationId: inv.id, userId: account.userId },
        'system',
      );
      return account;
    },
    loadActor: (userId) => loadActor(deps.db, userId),
  };
}

interface Invitation {
  readonly email: string;
  readonly kind: 'staff' | 'client' | 'partner';
}
interface AcceptRequest {
  readonly name: string;
  readonly password: string;
}

/**
 * Creates the account inside the invitation scope. If the account already exists, a previous attempt
 * created it and then failed to grant the roles (the invitation is still open, so it was never accepted):
 * the person proves it is theirs with the password and the grant runs again. No other path gets here —
 * an open invitation cannot exist for an email that has a joined account (identity.user.invite refuses it).
 */
async function createOrResumeAccount(
  auth: Auth,
  inv: Invitation,
  req: AcceptRequest,
  headers: Headers,
): Promise<{ userId: string; headers: Headers }> {
  try {
    const signUp = await invitationScope.run({ email: inv.email, kind: inv.kind }, () =>
      auth.api.signUpEmail({
        body: { email: inv.email, name: req.name, password: req.password },
        headers,
        returnHeaders: true,
      }),
    );
    return { userId: signUp.response.user.id, headers: signUp.headers };
  } catch (err) {
    if (!(err instanceof APIError) || err.body?.code !== 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') throw err;
    const signIn = await auth.api.signInEmail({
      body: { email: inv.email, password: req.password },
      headers,
      returnHeaders: true,
    });
    return { userId: signIn.response.user.id, headers: signIn.headers };
  }
}
