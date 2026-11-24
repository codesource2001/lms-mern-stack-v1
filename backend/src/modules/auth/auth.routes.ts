import { rateLimit } from 'express-rate-limit';
import { Router } from 'express';

import { env } from '../../config/env.js';
import { HTTP_STATUS } from '../../shared/http/status.js';
import { requireTrustedOrigin } from '../../middlewares/csrf.js';
import { createAuthController } from './auth.controller.js';
import { createRequireAuth, requirePermission } from './auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import type { AuthService } from './auth.service.js';
import {
  validateChangePassword,
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResendVerification,
  validateResetPassword,
  validateUpdateProfile,
  validateVerifyEmail,
} from './auth.validation.js';

function errorBody(req: { id: string }, message: string, code: string) {
  return {
    success: false,
    message,
    code,
    requestId: req.id,
  };
}

function authRateLimiter(max: number) {
  return rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res
        .status(HTTP_STATUS.TOO_MANY_REQUESTS)
        .json(errorBody(req, 'Too many requests. Please retry later.', 'RATE_LIMITED'));
    },
  });
}

const loginLimiter = authRateLimiter(env.AUTH_LOGIN_RATE_LIMIT_MAX);
const registerLimiter = authRateLimiter(env.AUTH_REGISTER_RATE_LIMIT_MAX);
const resetLimiter = authRateLimiter(env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX);
const refreshLimiter = authRateLimiter(env.AUTH_REFRESH_RATE_LIMIT_MAX);
const verifyLimiter = authRateLimiter(env.AUTH_VERIFY_RATE_LIMIT_MAX);

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const controller = createAuthController(authService);
  const requireAuth = createRequireAuth(authService);

  router.post('/register', registerLimiter, validateRegister, controller.register);
  router.post('/verify-email', verifyLimiter, validateVerifyEmail, controller.verifyEmail);
  router.post(
    '/resend-verification',
    registerLimiter,
    validateResendVerification,
    controller.resendVerification,
  );

  router.post('/login', loginLimiter, validateLogin, controller.login);
  router.post('/refresh', refreshLimiter, requireTrustedOrigin, controller.refresh);
  router.post('/logout', refreshLimiter, requireTrustedOrigin, controller.logout);

  router.get('/me', requireAuth, requirePermission(PERMISSIONS.PROFILE_READ), controller.me);
  router.patch(
    '/me',
    requireAuth,
    requirePermission(PERMISSIONS.PROFILE_WRITE),
    validateUpdateProfile,
    controller.updateProfile,
  );
  router.post(
    '/change-password',
    requireAuth,
    requirePermission(PERMISSIONS.ACCOUNT_SECURITY),
    validateChangePassword,
    controller.changePassword,
  );
  router.post(
    '/logout-all',
    requireAuth,
    requirePermission(PERMISSIONS.ACCOUNT_SECURITY),
    controller.logoutAll,
  );

  router.post('/forgot-password', resetLimiter, validateForgotPassword, controller.forgotPassword);
  router.post('/reset-password', resetLimiter, validateResetPassword, controller.resetPassword);

  return router;
}
