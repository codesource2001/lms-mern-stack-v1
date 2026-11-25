import type { RequestHandler } from 'express';

import { AppError } from '../../shared/errors/app-error.js';
import type { AuthPrincipal } from './auth.types.js';
import type { AuthService } from './auth.service.js';
import { authService } from './auth.service.js';

const ADMIN_ROLES = new Set(['super_admin', 'admin']);

export function hasAdminRole(principal: Pick<AuthPrincipal, 'roles'>): boolean {
  return principal.roles.some((role) => ADMIN_ROLES.has(role));
}

export function createRequireAuth(service: AuthService): RequestHandler {
  return async (req, _res, next) => {
    const authorization = req.get('authorization');

    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      next(
        new AppError('Authentication is required', {
          statusCode: 401,
          code: 'AUTH_REQUIRED',
        }),
      );
      return;
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (token.length === 0) {
      next(
        new AppError('Authentication is required', {
          statusCode: 401,
          code: 'AUTH_REQUIRED',
        }),
      );
      return;
    }

    try {
      const claims = service.accessTokens.verify(token);
      const principal = await service.resolvePrincipal(claims);
      req.auth = principal;
      next();
    } catch (error) {
      const reason =
        error instanceof Error && 'reason' in error
          ? (error as { reason?: string }).reason
          : undefined;

      next(
        new AppError('Authentication is required', {
          statusCode: 401,
          code: reason === 'expired' ? 'ACCESS_TOKEN_EXPIRED' : 'INVALID_ACCESS_TOKEN',
        }),
      );
    }
  };
}

export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    const principal = req.auth;

    if (principal === undefined) {
      next(
        new AppError('Authentication is required', {
          statusCode: 401,
          code: 'AUTH_REQUIRED',
        }),
      );
      return;
    }

    if (!principal.permissions.includes(permission)) {
      next(
        new AppError('You do not have permission to perform this action', {
          statusCode: 403,
          code: 'FORBIDDEN',
        }),
      );
      return;
    }

    next();
  };
}

export const requireAuth = createRequireAuth(authService);
