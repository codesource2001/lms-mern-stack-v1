import type { Request, RequestHandler } from 'express';

import { env } from '../../config/env.js';
import { sendSuccess } from '../../shared/http/response.js';
import { HTTP_STATUS } from '../../shared/http/status.js';
import { getValidated } from '../../middlewares/validate.js';
import { hashMetadata } from '../../shared/security/metadata.js';
import type { AuthService } from './auth.service.js';
import { authService } from './auth.service.js';
import type { AuthContext } from './auth.types.js';
import { clearRefreshCookie, setRefreshCookie } from './auth.cookies.js';

function readRefreshCookie(req: Request): string | undefined {
  const cookies: unknown = req.cookies;

  if (typeof cookies !== 'object' || cookies === null) {
    return undefined;
  }

  const value = (cookies as Record<string, unknown>)[env.AUTH_COOKIE_NAME];

  return typeof value === 'string' ? value : undefined;
}

function authContext(req: Request): AuthContext {
  return {
    requestId: req.id,
    ipHash: hashMetadata(req.ip),
    userAgentHash: hashMetadata(req.get('user-agent')),
  };
}

export function createAuthController(service: AuthService) {
  const register: RequestHandler = async (req, res) => {
    const input = getValidated<{ name: string; email: string; password: string }>(req, 'body');
    const result = await service.register(input, authContext(req));

    sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: result.message,
      data: {},
    });
  };

  const verifyEmail: RequestHandler = async (req, res) => {
    const input = getValidated<{ token: string }>(req, 'body');
    const result = await service.verifyEmail(input.token, authContext(req));

    sendSuccess(res, { message: result.message, data: {} });
  };

  const resendVerification: RequestHandler = async (req, res) => {
    const input = getValidated<{ email: string }>(req, 'body');
    const result = await service.resendVerification(input.email, authContext(req));

    sendSuccess(res, { message: result.message, data: {} });
  };

  const login: RequestHandler = async (req, res) => {
    const input = getValidated<{ email: string; password: string }>(req, 'body');
    const result = await service.login(input, authContext(req));

    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt.getTime() - Date.now());

    sendSuccess(res, {
      message: 'Signed in',
      data: {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
        user: result.user,
      },
    });
  };

  const refresh: RequestHandler = async (req, res) => {
    try {
      const result = await service.refresh(readRefreshCookie(req), authContext(req));

      setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt.getTime() - Date.now());

      sendSuccess(res, {
        message: 'Session refreshed',
        data: {
          accessToken: result.accessToken,
          tokenType: 'Bearer',
          expiresIn: result.expiresIn,
          user: result.user,
        },
      });
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  };

  const logout: RequestHandler = async (req, res) => {
    try {
      await service.logout(readRefreshCookie(req), authContext(req));
    } finally {
      clearRefreshCookie(res);
    }

    sendSuccess(res, { message: 'Signed out', data: {} });
  };

  const me: RequestHandler = async (req, res) => {
    const principal = req.auth!;

    const user = await service.me(principal);

    sendSuccess(res, { message: 'Current user', data: { user } });
  };

  const updateProfile: RequestHandler = async (req, res) => {
    const principal = req.auth!;
    const input = getValidated<{ name: string }>(req, 'body');
    const user = await service.updateProfile(principal, input, authContext(req));

    sendSuccess(res, { message: 'Profile updated', data: { user } });
  };

  const changePassword: RequestHandler = async (req, res) => {
    const principal = req.auth!;
    const input = getValidated<{ currentPassword: string; newPassword: string }>(req, 'body');
    const result = await service.changePassword(principal, input, authContext(req));

    clearRefreshCookie(res);

    sendSuccess(res, { message: result.message, data: {} });
  };

  const logoutAll: RequestHandler = async (req, res) => {
    const principal = req.auth!;
    await service.logoutAll(principal, authContext(req));

    clearRefreshCookie(res);

    sendSuccess(res, { message: 'Signed out of all sessions', data: {} });
  };

  const forgotPassword: RequestHandler = async (req, res) => {
    const input = getValidated<{ email: string }>(req, 'body');
    const result = await service.forgotPassword(input.email, authContext(req));

    sendSuccess(res, { message: result.message, data: {} });
  };

  const resetPassword: RequestHandler = async (req, res) => {
    const input = getValidated<{ token: string; password: string }>(req, 'body');

    try {
      const result = await service.resetPassword(input.token, input.password, authContext(req));
      clearRefreshCookie(res);
      sendSuccess(res, { message: result.message, data: {} });
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  };

  return {
    register,
    verifyEmail,
    resendVerification,
    login,
    refresh,
    logout,
    me,
    updateProfile,
    changePassword,
    logoutAll,
    forgotPassword,
    resetPassword,
  };
}

export const authController = createAuthController(authService);
