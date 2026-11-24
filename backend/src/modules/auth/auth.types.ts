import type { UserRecord } from '../users/user.repository.js';

export interface AuthContext {
  requestId: string;
  ipHash: string;
  userAgentHash: string;
}

export interface AuthPrincipal {
  userId: string;
  sessionId: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
}

export interface AuthRoleView {
  slug: string;
  name: string;
}

export interface AuthUserView {
  id: string;
  name: string;
  email: string;
  status: UserRecord['status'];
  roles: AuthRoleView[];
  permissions: string[];
  emailVerified: boolean;
}

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthUserView;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileUpdateInput {
  name: string;
}

export interface AuthServiceDeps {
  users: UserServicePort;
  rbac: RbacServicePort;
  audit: AuditServicePort;
  sessions: SessionRepositoryPort;
  refreshTokens: RefreshTokenRepositoryPort;
  email: EmailServicePort;
  passwords: PasswordServicePort;
  accessTokens: AccessTokenServicePort;
  now?: () => Date;
  options?: AuthOptions;
}

export interface AuthOptions {
  maxLoginAttempts: number;
  lockoutBaseMs: number;
  lockoutMaxMs: number;
  verificationTtlMs: number;
  passwordResetTtlMs: number;
  refreshIdleTtlMs: number;
  refreshAbsoluteTtlMs: number;
}

export interface UserServicePort {
  createUnverifiedUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    roleId: string;
  }): Promise<{ user: UserRecord; verificationToken: string }>;
  issueVerificationToken(userId: string): Promise<string>;
  findForLogin(email: string): Promise<(UserRecord & { passwordHash: string }) | null>;
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByIdWithPassword(id: string): Promise<(UserRecord & { passwordHash: string }) | null>;
  markEmailVerified(token: string, now: Date): Promise<UserRecord | null>;
  requestPasswordReset(
    email: string,
    now: Date,
  ): Promise<{ user: UserRecord; token: string } | null>;
  resetPasswordWithToken(
    token: string,
    passwordHash: string,
    now: Date,
  ): Promise<UserRecord | null>;
  updatePassword(id: string, passwordHash: string, now: Date): Promise<UserRecord | null>;
  recordLoginSuccess(id: string, now: Date): Promise<void>;
  recordFailedLogin(
    id: string,
    now: Date,
  ): Promise<{ failedLoginAttempts: number; lockoutLevel: number; lockUntil: Date | null } | null>;
  updateName(id: string, name: string): Promise<UserRecord | null>;
  incrementTokenVersion(id: string): Promise<void>;
}

export interface RbacServicePort {
  getRoleBySlug(
    slug: string,
  ): Promise<{ id: string; slug: string; name: string; permissionCodes: string[] } | null>;
  getAccessForRoles(roleIds: readonly string[]): Promise<{
    roles: Array<{ slug: string; name: string }>;
    permissions: string[];
  }>;
}

export interface AuditServicePort {
  record(entry: {
    actorUserId: string | null;
    action: string;
    result: 'success' | 'failure';
    targetType?: string;
    targetId?: string;
    ipHash?: string | null;
    userAgentHash?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface SessionRepositoryPort {
  create(input: {
    userId: string;
    tokenVersion: number;
    userAgentHash: string;
    ipHash: string;
    expiresAt: Date;
  }): Promise<{ id: string }>;
  findById(id: string): Promise<{
    id: string;
    userId: string;
    tokenVersion: number;
    userAgentHash: string;
    ipHash: string;
    lastUsedAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    revokedReason: string | null;
  } | null>;
  revoke(id: string, reason: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, reason: string, at: Date): Promise<void>;
  touch(id: string, at: Date): Promise<void>;
}

export interface RefreshTokenRepositoryPort {
  create(input: {
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<{ id: string; sessionId: string }>;
  findByHash(hash: string): Promise<{
    id: string;
    sessionId: string;
    expiresAt: Date;
    usedAt: Date | null;
    revokedAt: Date | null;
  } | null>;
  markUsed(id: string, at: Date): Promise<boolean>;
  revoke(id: string, at: Date): Promise<void>;
  revokeAllForSession(sessionId: string, at: Date): Promise<void>;
}

export interface EmailServicePort {
  send(message: { to: string; subject: string; text: string; html: string }): Promise<void>;
}

export interface PasswordServicePort {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  verifyDummy(password: string): Promise<boolean>;
}

export interface AccessTokenServicePort {
  sign(claims: { userId: string; sessionId: string; tokenVersion: number }): {
    token: string;
    expiresIn: number;
  };
  verify(token: string): { userId: string; sessionId: string; tokenVersion: number };
}
