import { describe, expect, it } from 'vitest';

import { JwtAccessTokenService } from '../src/modules/auth/access-token.service.js';

describe('access tokens', () => {
  const service = new JwtAccessTokenService({
    secret: '0123456789abcdef0123456789abcdef',
    issuer: 'atrium-lms',
    audience: 'atrium-api',
    ttlSeconds: 300,
  });

  it('signs and verifies a token', () => {
    const signed = service.sign({ userId: 'user-1', sessionId: 'session-1', tokenVersion: 2 });

    expect(service.verify(signed.token)).toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
      tokenVersion: 2,
    });
  });

  it('rejects tokens signed with a different secret', () => {
    const other = new JwtAccessTokenService({
      secret: 'fedcba9876543210fedcba9876543210',
      issuer: 'atrium-lms',
      audience: 'atrium-api',
      ttlSeconds: 300,
    });

    const signed = other.sign({ userId: 'user-1', sessionId: 'session-1', tokenVersion: 2 });

    expect(() => service.verify(signed.token)).toThrow();
  });

  it('rejects malformed tokens', () => {
    expect(() => service.verify('not-a-jwt')).toThrow();
  });
});
