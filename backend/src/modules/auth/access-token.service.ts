import { randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
  tokenVersion: number;
}

export class AccessTokenError extends Error {
  constructor(public readonly reason: 'expired' | 'invalid') {
    super(reason === 'expired' ? 'Access token has expired' : 'Access token is invalid');
    this.name = 'AccessTokenError';
  }
}

export interface AccessTokenService {
  sign(claims: AccessTokenClaims): { token: string; expiresIn: number };
  verify(token: string): AccessTokenClaims;
}

export class JwtAccessTokenService implements AccessTokenService {
  constructor(
    private readonly options: {
      secret: string;
      issuer: string;
      audience: string;
      ttlSeconds: number;
    } = {
      secret: env.AUTH_JWT_SECRET,
      issuer: env.AUTH_JWT_ISSUER,
      audience: env.AUTH_JWT_AUDIENCE,
      ttlSeconds: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    },
  ) {}

  sign(claims: AccessTokenClaims): { token: string; expiresIn: number } {
    const token = jwt.sign(
      {
        sid: claims.sessionId,
        ver: claims.tokenVersion,
        token_use: 'access',
      },
      this.options.secret,
      {
        algorithm: 'HS256',
        subject: claims.userId,
        issuer: this.options.issuer,
        audience: this.options.audience,
        expiresIn: this.options.ttlSeconds,
        jwtid: randomUUID(),
      },
    );

    return { token, expiresIn: this.options.ttlSeconds };
  }

  verify(token: string): AccessTokenClaims {
    try {
      const payload = jwt.verify(token, this.options.secret, {
        algorithms: ['HS256'],
        issuer: this.options.issuer,
        audience: this.options.audience,
        clockTolerance: 5,
      }) as jwt.JwtPayload;

      if (typeof payload === 'string' || payload.token_use !== 'access') {
        throw new AccessTokenError('invalid');
      }

      const userId = payload.sub as unknown;
      const sessionId = payload.sid as unknown;
      const tokenVersion = payload.ver as unknown;

      if (
        typeof userId !== 'string' ||
        typeof sessionId !== 'string' ||
        typeof tokenVersion !== 'number' ||
        !Number.isInteger(tokenVersion) ||
        tokenVersion < 0
      ) {
        throw new AccessTokenError('invalid');
      }

      return { userId, sessionId, tokenVersion };
    } catch (error) {
      if (error instanceof AccessTokenError) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new AccessTokenError('expired');
      }

      throw new AccessTokenError('invalid');
    }
  }
}

export const accessTokenService = new JwtAccessTokenService();
