// identity repository — the only place in this module that touches tables.
import {
  and,
  authUser,
  eq,
  inActorTransaction,
  invitation,
  isNull,
  sql,
  userRole,
  type createAuthPool,
  type Db,
  type Tx,
} from '@ocs/db';
import type { Actor, Role } from '@ocs/contracts';
import { systemActor } from '../kernel/index.ts';

/** The pool better-auth runs on (role ocs_auth, schema auth). */
export type AuthPool = ReturnType<typeof createAuthPool>;

export type InvitationRow = typeof invitation.$inferSelect;
export type UserRow = Pick<
  typeof authUser.$inferSelect,
  'id' | 'name' | 'email' | 'kind' | 'archivedAt' | 'twoFactorEnabled'
>;

const userColumns = {
  id: authUser.id,
  name: authUser.name,
  email: authUser.email,
  kind: authUser.kind,
  archivedAt: authUser.archivedAt,
  twoFactorEnabled: authUser.twoFactorEnabled,
};

export async function insertInvitation(tx: Tx, row: typeof invitation.$inferInsert): Promise<void> {
  await tx.insert(invitation).values(row);
}

export async function findOpenInvitationByTokenHash(
  tx: Tx,
  tokenHash: string,
): Promise<InvitationRow | undefined> {
  const rows = await tx
    .select()
    .from(invitation)
    .where(
      and(eq(invitation.tokenHash, tokenHash), isNull(invitation.acceptedAt), isNull(invitation.revokedAt)),
    );
  return rows[0];
}

export async function findInvitation(tx: Tx, id: string): Promise<InvitationRow | undefined> {
  return (await tx.select().from(invitation).where(eq(invitation.id, id)))[0];
}

export async function findOpenInvitationForEmail(tx: Tx, email: string): Promise<InvitationRow | undefined> {
  const rows = await tx
    .select()
    .from(invitation)
    .where(
      and(
        sql`lower(${invitation.email}) = lower(${email})`,
        isNull(invitation.acceptedAt),
        isNull(invitation.revokedAt),
      ),
    );
  return rows[0];
}

export async function markInvitationAccepted(tx: Tx, id: string, userId: string, at: Date): Promise<void> {
  await tx.update(invitation).set({ acceptedAt: at, acceptedUserId: userId }).where(eq(invitation.id, id));
}

export async function findUserByEmail(tx: Tx, email: string): Promise<UserRow | undefined> {
  return (
    await tx
      .select(userColumns)
      .from(authUser)
      .where(sql`lower(${authUser.email}) = lower(${email})`)
  )[0];
}

export async function findUser(tx: Tx, id: string): Promise<UserRow | undefined> {
  return (await tx.select(userColumns).from(authUser).where(eq(authUser.id, id)))[0];
}

export async function countUsers(tx: Tx): Promise<number> {
  const rows = await tx.select({ n: sql<number>`count(*)::int` }).from(authUser);
  return rows[0]?.n ?? 0;
}

export async function grantRoles(
  tx: Tx,
  rows: { id: string; userId: string; role: Role; grantedBy: string; grantedAt: Date }[],
): Promise<void> {
  if (rows.length > 0) await tx.insert(userRole).values(rows);
}

export async function activeRoles(tx: Tx, userId: string): Promise<Role[]> {
  const rows = await tx
    .select({ role: userRole.role })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), isNull(userRole.revokedAt)));
  return rows.map((r) => r.role as Role).sort();
}

/**
 * The actor behind a signed-in user: kind and active roles. Runs before any actor exists, so it reads as
 * the system actor. Archived users resolve to undefined. External users carry no client ids until the
 * client portal (V1.1) links them to clients.
 */
export async function loadActor(db: Db, userId: string): Promise<Actor | undefined> {
  return inActorTransaction(
    db,
    systemActor('identity'),
    async (tx) => {
      const user = await findUser(tx, userId);
      if (!user || user.archivedAt) return undefined;
      return { id: user.id, kind: user.kind, clientIds: [], roles: await activeRoles(tx, userId) };
    },
    { readOnly: true },
  );
}
