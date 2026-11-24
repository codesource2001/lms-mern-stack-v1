import { createHmac } from 'node:crypto';

import { env } from '../../config/env.js';

/**
 * Hashes request metadata with a server-side key. Plain hashes of IP addresses
 * are reversible by enumeration; HMAC prevents that while still allowing
 * correlation of sessions from the same network without storing the raw value.
 */
export function hashMetadata(value: string | undefined): string {
  const normalized = (value ?? 'unknown').trim().slice(0, 512) || 'unknown';

  return createHmac('sha256', env.AUTH_METADATA_SECRET).update(normalized).digest('hex');
}
