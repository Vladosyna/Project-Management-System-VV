// The platform's login wants the password AES-encrypted with the account's appkey: 192-bit key, ECB, PKCS7,
// Base64 (OpenAPI v2 "Login API"). ECB is the platform's choice, not ours; this is only its wire format.
// Why the semgrep exemption below is safe: ECB leaks repeated plaintext blocks, which matters for bulk data. Here
// it wraps one short password per login, sent over HTTPS, and the result is itself a password-equivalent — no
// other mode is accepted by the platform. Never use this helper for anything else.
import { createCipheriv } from 'node:crypto';

export function encryptPassword(password: string, appkey: string): string {
  const key = Buffer.from(appkey, 'utf8');
  if (key.length !== 24) throw new Error('device platform appkey must be 24 bytes (AES-192)');
  // nosemgrep: ajinabraham.njsscan.crypto.crypto_node.node_aes_ecb -- platform-mandated wire format, see above
  const cipher = createCipheriv('aes-192-ecb', key, null); // PKCS7 padding is the default
  return Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]).toString('base64');
}
