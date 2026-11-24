import { AppError } from '../../shared/errors/app-error.js';
import { hashOpaqueToken, createOpaqueToken } from '../../shared/security/opaque-token.js';
import {
  createEmailService,
  verificationEmailTemplate,
  passwordResetEmailTemplate,
} from '../../infrastructure/email/email.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AUDIT_ACTIONS } from './auth.constants.js';
import { ROLE_SLUGS } from './auth.constants.js';
import type {
  AuthContext,
  AuthOptions,
  AuthPrincipal,
  AuthResult,
  AuthUserView,
  AuthServiceDeps,
  ChangePasswordInput,
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
} from './auth.types.js';
import type { UserRecord } from '../users/user.repository.js';

const defaultOptions = (depsOptions?: AuthOptions): AuthOptions => ({
  maxLoginAttempts: depsOptions?.maxLoginAttempts ?? env.AUTH_MAX_LOGIN_ATTEMPTS,
  lockoutBaseMs: depsOptions?.lockoutBaseMs ?? env.AUTH_LOCKOUT_BASE_MS,
  lockoutMaxMs: depsOptions?.lockoutMaxMs ?? env.AUTH_LOCKOUT_MAX_MS,
  verificationTtlMs:
    depsOptions?.verificationTtlMs ?? env.AUTH_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000,
  passwordResetTtlMs:
    depsOptions?.passwordResetTtlMs ?? env.AUTH_PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  refreshIdleTtlMs:
    depsOptions?.refreshIdleTtlMs ?? env.AUTH_REFRESH_IDLE_TTL_DAYS * 24 * 60 * 60 * 1000,
  refreshAbsoluteTtlMs:
    depsOptions?.refreshAbsoluteTtlMs ?? env.AUTH_REFRESH_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000,
});

export class AuthService {
  private readonly deps: AuthServiceDeps;
  private readonly options: AuthOptions;

  get accessTokens() {
    return this.deps.accessTokens;
  }

  constructor(deps: AuthServiceDeps) {
    this.deps = deps;
    this.options = defaultOptions(deps.options);
  }

  private now(): Date {
    return this.deps.now === undefined ? new Date() : this.deps.now();
  }

  private async buildUserView(user: UserRecord): Promise<AuthUserView> {
    const access = await this.deps.rbac.getAccessForRoles(user.roleIds);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roles: access.roles,
      permissions: access.permissions,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }

  private async sendEmailSafely(
    user: UserRecord,
    message: { subject: string; text: string; html: string },
    purpose: string,
    context: AuthContext,
  ): Promise<boolean> {
    try {
      await this.deps.email.send({
        to: user.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return true;
    } catch (error) {
      logger.error({ err: error, purpose, userId: user.id }, 'Email delivery failed');
      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.REGISTRATION_EMAIL_DELIVERY_FAILED,
        result: 'failure',
        targetType: 'email',
        targetId: user.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { purpose },
      });
      return false;
    }
  }

  async register(input: RegisterInput, context: AuthContext): Promise<{ message: string }> {
    const role = await this.deps.rbac.getRoleBySlug(ROLE_SLUGS.STUDENT);

    if (role === null) {
      throw new AppError('Authentication is not configured', {
        statusCode: 503,
        code: 'AUTH_NOT_CONFIGURED',
      });
    }

    const passwordHash = await this.deps.passwords.hash(input.password);
    const { user, verificationToken } = await this.deps.users.createUnverifiedUser({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      roleId: role.id,
    });

    const verificationUrl = `${env.APP_WEB_URL.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(verificationToken)}`;
    await this.sendEmailSafely(
      user,
      verificationEmailTemplate({ name: user.name, verificationUrl }),
      'email_verification',
      context,
    );

    await this.deps.audit.record({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.REGISTRATION_SUCCEEDED,
      result: 'success',
      targetType: 'user',
      targetId: user.id,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });

    return {
      message: 'Account created. Check your email to verify your address before signing in.',
    };
  }

  async verifyEmail(token: string, context: AuthContext): Promise<{ message: string }> {
    const now = this.now();
    const user = await this.deps.users.markEmailVerified(token, now);

    if (user === null) {
      await this.deps.audit.record({
        actorUserId: null,
        action: AUDIT_ACTIONS.EMAIL_VERIFIED,
        result: 'failure',
        targetType: 'verification_token',
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'invalid_or_expired' },
      });

      throw new AppError('Verification link is invalid or has expired', {
        statusCode: 400,
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    }

    await this.deps.audit.record({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.EMAIL_VERIFIED,
      result: 'success',
      targetType: 'user',
      targetId: user.id,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });

    return { message: 'Email verified. You can now sign in.' };
  }

  async resendVerification(email: string, context: AuthContext): Promise<{ message: string }> {
    const user = await this.deps.users.findByEmail(email.trim().toLowerCase());

    if (user !== null && user.status === 'pending_verification') {
      const token = await this.deps.users.issueVerificationToken(user.id);
      const verificationUrl = `${env.APP_WEB_URL.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
      await this.sendEmailSafely(
        user,
        verificationEmailTemplate({ name: user.name, verificationUrl }),
        'email_verification',
        context,
      );

      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.EMAIL_VERIFICATION_RESENT,
        result: 'success',
        targetType: 'user',
        targetId: user.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
      });
    }

    return {
      message:
        'If an unverified account exists for that email, a new verification link has been sent.',
    };
  }

  async login(input: LoginInput, context: AuthContext): Promise<AuthResult> {
    const now = this.now();
    const email = input.email.trim().toLowerCase();
    const user = await this.deps.users.findForLogin(email);

    if (user === null) {
      await this.deps.passwords.verifyDummy(input.password);
      await this.deps.audit.record({
        actorUserId: null,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        result: 'failure',
        targetType: 'email',
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'unknown_account' },
      });

      throw new AppError('Invalid email or password', {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.lockUntil !== null && user.lockUntil.getTime() > now.getTime()) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((user.lockUntil.getTime() - now.getTime()) / 1000),
      );
      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        result: 'failure',
        targetType: 'user',
        targetId: user.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'locked' },
      });

      throw new AppError('Account is temporarily locked. Try again later.', {
        statusCode: 429,
        code: 'ACCOUNT_LOCKED',
        context: { retryAfterSeconds },
      });
    }

    const valid = await this.deps.passwords.verify(user.passwordHash, input.password);

    if (!valid) {
      const lockResult = await this.deps.users.recordFailedLogin(user.id, now);

      if (
        lockResult !== null &&
        lockResult.lockUntil !== null &&
        lockResult.lockUntil.getTime() > now.getTime()
      ) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((lockResult.lockUntil.getTime() - now.getTime()) / 1000),
        );
        await this.deps.audit.record({
          actorUserId: user.id,
          action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
          result: 'failure',
          targetType: 'user',
          targetId: user.id,
          ipHash: context.ipHash,
          userAgentHash: context.userAgentHash,
          requestId: context.requestId,
          metadata: { retryAfterSeconds },
        });

        throw new AppError('Account is temporarily locked. Try again later.', {
          statusCode: 429,
          code: 'ACCOUNT_LOCKED',
          context: { retryAfterSeconds },
        });
      }

      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        result: 'failure',
        targetType: 'user',
        targetId: user.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'invalid_password' },
      });

      throw new AppError('Invalid email or password', {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.status === 'pending_verification') {
      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        result: 'failure',
        targetType: 'user',
        targetId: user.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'unverified' },
      });

      throw new AppError('Verify your email address before signing in', {
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (user.status !== 'active') {
      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        result: 'failure',
        targetType: 'user',
        targetId: user.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'suspended' },
      });

      throw new AppError('Account is not available', {
        statusCode: 403,
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    const absoluteExpiresAt = new Date(now.getTime() + this.options.refreshAbsoluteTtlMs);
    const session = await this.deps.sessions.create({
      userId: user.id,
      tokenVersion: user.tokenVersion,
      userAgentHash: context.userAgentHash,
      ipHash: context.ipHash,
      expiresAt: absoluteExpiresAt,
    });

    const rawRefreshToken = createOpaqueToken('atr_rt');
    const refreshExpiresAt = new Date(
      Math.min(now.getTime() + this.options.refreshIdleTtlMs, absoluteExpiresAt.getTime()),
    );

    try {
      await this.deps.refreshTokens.create({
        sessionId: session.id,
        tokenHash: hashOpaqueToken(rawRefreshToken),
        expiresAt: refreshExpiresAt,
      });
    } catch (error) {
      await this.deps.sessions.revoke(session.id, 'refresh_token_create_failed', now);
      throw error;
    }

    await this.deps.users.recordLoginSuccess(user.id, now);

    const { token: accessToken } = this.deps.accessTokens.sign({
      userId: user.id,
      sessionId: session.id,
      tokenVersion: user.tokenVersion,
    });

    await this.deps.audit.record({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.LOGIN_SUCCEEDED,
      result: 'success',
      targetType: 'session',
      targetId: session.id,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });

    return {
      accessToken,
      expiresIn: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: rawRefreshToken,
      refreshExpiresAt,
      user: await this.buildUserView(user),
    };
  }

  async refresh(rawToken: string | undefined, context: AuthContext): Promise<AuthResult> {
    const now = this.now();

    if (rawToken === undefined || rawToken.trim() === '') {
      throw new AppError('Session is expired or invalid', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const tokenRecord = await this.deps.refreshTokens.findByHash(hashOpaqueToken(rawToken));

    if (tokenRecord === null) {
      throw new AppError('Session is expired or invalid', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const session = await this.deps.sessions.findById(tokenRecord.sessionId);

    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= now.getTime()
    ) {
      if (session !== null) {
        await this.deps.sessions.revoke(session.id, 'session_expired', now);
        await this.deps.refreshTokens.revokeAllForSession(session.id, now);
      }

      throw new AppError('Session is expired or invalid', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await this.deps.users.findById(session.userId);

    if (user === null || user.status !== 'active' || user.tokenVersion !== session.tokenVersion) {
      await this.deps.sessions.revoke(session.id, 'user_unavailable', now);
      await this.deps.refreshTokens.revokeAllForSession(session.id, now);

      throw new AppError('Session is expired or invalid', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    if (tokenRecord.usedAt !== null || tokenRecord.revokedAt !== null) {
      await this.deps.sessions.revoke(session.id, 'refresh_token_reuse', now);
      await this.deps.refreshTokens.revokeAllForSession(session.id, now);

      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.REFRESH_REUSE_DETECTED,
        result: 'failure',
        targetType: 'session',
        targetId: session.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
      });

      throw new AppError('Session is expired or invalid', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const marked = await this.deps.refreshTokens.markUsed(tokenRecord.id, now);

    if (!marked) {
      await this.deps.sessions.revoke(session.id, 'refresh_token_reuse', now);
      await this.deps.refreshTokens.revokeAllForSession(session.id, now);

      await this.deps.audit.record({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.REFRESH_REUSE_DETECTED,
        result: 'failure',
        targetType: 'session',
        targetId: session.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
      });

      throw new AppError('Session is expired or invalid', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const newRawRefreshToken = createOpaqueToken('atr_rt');
    const newExpiresAt = new Date(
      Math.min(now.getTime() + this.options.refreshIdleTtlMs, session.expiresAt.getTime()),
    );

    if (newExpiresAt.getTime() <= now.getTime()) {
      await this.deps.sessions.revoke(session.id, 'session_expired', now);
      await this.deps.refreshTokens.revokeAllForSession(session.id, now);

      throw new AppError('Session is expired or invalid', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    try {
      await this.deps.refreshTokens.create({
        sessionId: session.id,
        tokenHash: hashOpaqueToken(newRawRefreshToken),
        expiresAt: newExpiresAt,
      });
    } catch (error) {
      await this.deps.sessions.revoke(session.id, 'refresh_token_create_failed', now);
      await this.deps.refreshTokens.revokeAllForSession(session.id, now);
      throw error;
    }

    await this.deps.sessions.touch(session.id, now);

    const { token: accessToken } = this.deps.accessTokens.sign({
      userId: user.id,
      sessionId: session.id,
      tokenVersion: user.tokenVersion,
    });

    return {
      accessToken,
      expiresIn: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: newRawRefreshToken,
      refreshExpiresAt: newExpiresAt,
      user: await this.buildUserView(user),
    };
  }

  async logout(rawToken: string | undefined, context: AuthContext): Promise<void> {
    if (rawToken === undefined || rawToken.trim() === '') {
      return;
    }

    const tokenRecord = await this.deps.refreshTokens.findByHash(hashOpaqueToken(rawToken));

    if (tokenRecord === null) {
      return;
    }

    const session = await this.deps.sessions.findById(tokenRecord.sessionId);

    if (session === null) {
      return;
    }

    const now = this.now();
    await this.deps.sessions.revoke(session.id, 'logout', now);
    await this.deps.refreshTokens.revokeAllForSession(session.id, now);

    await this.deps.audit.record({
      actorUserId: session.userId,
      action: AUDIT_ACTIONS.LOGOUT,
      result: 'success',
      targetType: 'session',
      targetId: session.id,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });
  }

  async logoutAll(principal: AuthPrincipal, context: AuthContext): Promise<void> {
    const now = this.now();
    await this.deps.sessions.revokeAllForUser(principal.userId, 'logout_all', now);
    await this.deps.users.incrementTokenVersion(principal.userId);

    await this.deps.audit.record({
      actorUserId: principal.userId,
      action: AUDIT_ACTIONS.LOGOUT_ALL,
      result: 'success',
      targetType: 'user',
      targetId: principal.userId,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });
  }

  async me(principal: AuthPrincipal): Promise<AuthUserView> {
    const user = await this.deps.users.findById(principal.userId);

    if (user === null || user.status !== 'active') {
      throw new AppError('Authentication is required', {
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    return this.buildUserView(user);
  }

  async updateProfile(
    principal: AuthPrincipal,
    input: ProfileUpdateInput,
    context: AuthContext,
  ): Promise<AuthUserView> {
    const user = await this.deps.users.updateName(principal.userId, input.name.trim());

    if (user === null) {
      throw new AppError('Authentication is required', {
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    await this.deps.audit.record({
      actorUserId: principal.userId,
      action: AUDIT_ACTIONS.PROFILE_UPDATED,
      result: 'success',
      targetType: 'user',
      targetId: principal.userId,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });

    return this.buildUserView(user);
  }

  async changePassword(
    principal: AuthPrincipal,
    input: ChangePasswordInput,
    context: AuthContext,
  ): Promise<{ message: string }> {
    if (input.currentPassword === input.newPassword) {
      throw new AppError('New password must differ from the current password', {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        details: [{ field: 'newPassword', message: 'must differ from current password' }],
      });
    }

    const user = await this.deps.users.findByIdWithPassword(principal.userId);

    if (user === null || user.status !== 'active') {
      throw new AppError('Authentication is required', {
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    const valid = await this.deps.passwords.verify(user.passwordHash, input.currentPassword);

    if (!valid) {
      await this.deps.audit.record({
        actorUserId: principal.userId,
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        result: 'failure',
        targetType: 'user',
        targetId: principal.userId,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'invalid_current_password' },
      });

      throw new AppError('Current password is incorrect', {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const passwordHash = await this.deps.passwords.hash(input.newPassword);
    const updated = await this.deps.users.updatePassword(user.id, passwordHash, this.now());

    if (updated === null) {
      throw new AppError('Authentication is required', {
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    await this.deps.sessions.revokeAllForUser(user.id, 'password_change', this.now());

    await this.deps.audit.record({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      result: 'success',
      targetType: 'user',
      targetId: user.id,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });

    return { message: 'Password changed. Sign in again with your new password.' };
  }

  async forgotPassword(email: string, context: AuthContext): Promise<{ message: string }> {
    const now = this.now();
    const result = await this.deps.users.requestPasswordReset(email.trim().toLowerCase(), now);

    if (result !== null) {
      const resetUrl = `${env.APP_WEB_URL.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(result.token)}`;
      await this.sendEmailSafely(
        result.user,
        passwordResetEmailTemplate({ name: result.user.name, resetUrl }),
        'password_reset',
        context,
      );

      await this.deps.audit.record({
        actorUserId: result.user.id,
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        result: 'success',
        targetType: 'user',
        targetId: result.user.id,
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
      });
    }

    return {
      message: 'If an account exists for that email, a password reset link has been sent.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    context: AuthContext,
  ): Promise<{ message: string }> {
    const now = this.now();
    const passwordHash = await this.deps.passwords.hash(newPassword);
    const user = await this.deps.users.resetPasswordWithToken(token, passwordHash, now);

    if (user === null) {
      await this.deps.audit.record({
        actorUserId: null,
        action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
        result: 'failure',
        targetType: 'password_reset_token',
        ipHash: context.ipHash,
        userAgentHash: context.userAgentHash,
        requestId: context.requestId,
        metadata: { reason: 'invalid_or_expired' },
      });

      throw new AppError('Reset link is invalid or has expired', {
        statusCode: 400,
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    }

    await this.deps.sessions.revokeAllForUser(user.id, 'password_reset', now);
    await this.deps.users.incrementTokenVersion(user.id);

    await this.deps.audit.record({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      result: 'success',
      targetType: 'user',
      targetId: user.id,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      requestId: context.requestId,
    });

    return { message: 'Password reset. You can now sign in with your new password.' };
  }

  async resolvePrincipal(claims: {
    userId: string;
    sessionId: string;
    tokenVersion: number;
  }): Promise<AuthPrincipal> {
    const now = this.now();
    const session = await this.deps.sessions.findById(claims.sessionId);

    if (
      session === null ||
      session.userId !== claims.userId ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= now.getTime() ||
      session.tokenVersion !== claims.tokenVersion
    ) {
      throw new AppError('Authentication is required', {
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    const user = await this.deps.users.findById(session.userId);

    if (user === null || user.status !== 'active' || user.tokenVersion !== claims.tokenVersion) {
      throw new AppError('Authentication is required', {
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    const access = await this.deps.rbac.getAccessForRoles(user.roleIds);

    return {
      userId: user.id,
      sessionId: session.id,
      name: user.name,
      email: user.email,
      roles: access.roles.map((role) => role.slug),
      permissions: access.permissions,
      tokenVersion: user.tokenVersion,
    };
  }
}

import { userService } from '../users/user.service.js';
import { rbacService } from '../rbac/rbac.service.js';
import { auditService } from '../audit/audit.service.js';
import { sessionRepository, refreshTokenRepository } from './auth.repository.js';
import { passwordService as defaultPasswordService } from '../../shared/security/password.js';
import { accessTokenService } from './access-token.service.js';

export const authService = new AuthService({
  users: userService,
  rbac: rbacService,
  audit: auditService,
  sessions: sessionRepository,
  refreshTokens: refreshTokenRepository,
  email: createEmailService(),
  passwords: defaultPasswordService,
  accessTokens: accessTokenService,
  options: {
    maxLoginAttempts: env.AUTH_MAX_LOGIN_ATTEMPTS,
    lockoutBaseMs: env.AUTH_LOCKOUT_BASE_MS,
    lockoutMaxMs: env.AUTH_LOCKOUT_MAX_MS,
    verificationTtlMs: env.AUTH_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000,
    passwordResetTtlMs: env.AUTH_PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
    refreshIdleTtlMs: env.AUTH_REFRESH_IDLE_TTL_DAYS * 24 * 60 * 60 * 1000,
    refreshAbsoluteTtlMs: env.AUTH_REFRESH_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000,
  },
});
