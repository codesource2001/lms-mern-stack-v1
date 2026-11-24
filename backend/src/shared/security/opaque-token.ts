import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

/**
 * Creates an opaque, high-entropy token. Prefixes make leaked values easy to
 * identify without weakening the random portion.
 */
export function createOpaqueToken(prefix: 'atr_rt' | 'atr_ev' | 'atr_pr'): string {
  return `${prefix}_${randomBytes(TOKEN_BYTES).toString('base64url')}`;
}

/**
 * Tokens are stored as SHA-256 hashes. SHA-256 is appropriate here because the
 * input already has 256 bits of entropy; password hashing rules do not apply.
 */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
