// Invitation link tokens: 256 random bits, shown once; only the SHA-256 hash is stored.
import { createHash, randomBytes } from 'node:crypto';

export function newInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
