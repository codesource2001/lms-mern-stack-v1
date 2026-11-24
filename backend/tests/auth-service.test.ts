/* eslint-disable */
import { describe, expect, it } from 'vitest';

import { AuthService } from '../src/modules/auth/auth.service.js';
import type { AuthContext } from '../src/modules/auth/auth.types.js';
import { hashOpaqueToken } from '../src/shared/security/opaque-token.js';

const context: AuthContext = {
  requestId: 'req-1',
  ipHash: 'ip-hash',
  userAgentHash: 'ua-hash',
};

function makeUserService() {
  const users = new Map<string, any>();
  let counter = 0;

  const nextId = () => `user-${++counter}`;

  return {
    users,
    async createUnverifiedUser(input: {
      name: string;
      email: string;
      passwordHash: string;
      roleId: string;
    }) {
      if ([...users.values()].some((user) => user.email === input.email)) {
        throw new (await import('../src/shared/errors/app-error.js')).AppError(
          'An account with this email already exists',
          {
            statusCode: 409,
            code: 'EMAIL_IN_USE',
          },
        );
      }
      const id = nextId();
      const user: any = {
        id,
        name: input.name,
        email: input.email,
        status: 'pending_verification',
        roleIds: [input.roleId],
        emailVerifiedAt: null,
        passwordChangedAt: new Date(),
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockoutLevel: 0,
        lockUntil: null,
        tokenVersion: 0,
        passwordHash: input.passwordHash,
      };
      users.set(id, user);
      user.verificationTokenHash = hashOpaqueToken('verification-token');
      return { user, verificationToken: 'verification-token' };
    },
    async issueVerificationToken(userId: string) {
      const user = users.get(userId);
      user.verificationTokenHash = hashOpaqueToken('verification-token');
      return 'verification-token';
    },
    async findForLogin(email: string) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async findById(id: string) {
      return users.get(id) ?? null;
    },
    async findByEmail(email: string) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async findByIdWithPassword(id: string) {
      return users.get(id) ?? null;
    },
    async markEmailVerified(token: string) {
      const hash = hashOpaqueToken(token);
      const user = [...users.values()].find((item) => item.verificationTokenHash === hash);
      if (user === undefined) {
        return null;
      }
      user.status = 'active';
      user.emailVerifiedAt = new Date();
      return user;
    },
    async requestPasswordReset(email: string) {
      const user = [...users.values()].find(
        (item) => item.email === email && item.status !== 'suspended',
      );
      if (user === undefined) {
        return null;
      }
      user.passwordResetTokenHash = hashOpaqueToken('reset-token');
      return { user, token: 'reset-token' };
    },
    async resetPasswordWithToken(token: string, passwordHash: string) {
      const hash = hashOpaqueToken(token);
      const user = [...users.values()].find((item) => item.passwordResetTokenHash === hash);
      if (user === undefined) {
        return null;
      }
      user.passwordHash = passwordHash;
      user.passwordChangedAt = new Date();
      user.tokenVersion += 1;
      delete user.passwordResetTokenHash;
      if (user.status === 'pending_verification') {
        user.status = 'active';
        user.emailVerifiedAt = new Date();
      }
      return user;
    },
    async updatePassword(id: string, passwordHash: string) {
      const user = users.get(id);
      if (user === undefined) {
        return null;
      }
      user.passwordHash = passwordHash;
      user.passwordChangedAt = new Date();
      user.tokenVersion += 1;
      user.failedLoginAttempts = 0;
      user.lockoutLevel = 0;
      user.lockUntil = null;
      return user;
    },
    async recordLoginSuccess(id: string) {
      const user = users.get(id);
      if (user !== undefined) {
        user.lastLoginAt = new Date();
        user.failedLoginAttempts = 0;
        user.lockoutLevel = 0;
        user.lockUntil = null;
      }
    },
    async recordFailedLogin(id: string) {
      const user = users.get(id);
      if (user === undefined) {
        return null;
      }
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 2) {
        user.failedLoginAttempts = 0;
        user.lockoutLevel += 1;
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      return {
        failedLoginAttempts: user.failedLoginAttempts,
        lockoutLevel: user.lockoutLevel,
        lockUntil: user.lockUntil,
      };
    },
    async updateName(id: string, name: string) {
      const user = users.get(id);
      if (user === undefined) {
        return null;
      }
      user.name = name;
      return user;
    },
    async incrementTokenVersion(id: string) {
      const user = users.get(id);
      if (user !== undefined) {
        user.tokenVersion += 1;
      }
    },
  };
}

function makeSessionRepository() {
  const sessions = new Map<string, any>();
  let counter = 0;
  return {
    sessions,
    async create(input: any) {
      const id = `session-${++counter}`;
      const session = {
        id,
        ...input,
        lastUsedAt: new Date(),
        revokedAt: null,
        revokedReason: null,
      };
      sessions.set(id, session);
      return { id };
    },
    async findById(id: string) {
      return sessions.get(id) ?? null;
    },
    async revoke(id: string, reason: string, at: Date) {
      const session = sessions.get(id);
      if (session !== undefined) {
        session.revokedAt = at;
        session.revokedReason = reason;
      }
    },
    async revokeAllForUser(userId: string, reason: string, at: Date) {
      for (const session of sessions.values()) {
        if (session.userId === userId && session.revokedAt === null) {
          session.revokedAt = at;
          session.revokedReason = reason;
        }
      }
    },
    async touch(id: string, at: Date) {
      const session = sessions.get(id);
      if (session !== undefined) {
        session.lastUsedAt = at;
      }
    },
  };
}

function makeRefreshRepository() {
  const tokens = new Map<string, any>();
  let counter = 0;
  return {
    tokens,
    async create(input: { sessionId: string; tokenHash: string; expiresAt: Date }) {
      const id = `refresh-${++counter}`;
      const record = { id, ...input, usedAt: null, revokedAt: null, createdAt: new Date() };
      tokens.set(input.tokenHash, record);
      return { id, sessionId: input.sessionId };
    },
    async findByHash(hash: string) {
      const record = tokens.get(hash);
      if (record === undefined) {
        return null;
      }
      return {
        id: record.id,
        sessionId: record.sessionId,
        expiresAt: record.expiresAt,
        usedAt: record.usedAt,
        revokedAt: record.revokedAt,
      };
    },
    async markUsed(id: string) {
      const record = [...tokens.values()].find((item) => item.id === id);
      if (record === undefined || record.usedAt !== null || record.revokedAt !== null) {
        return false;
      }
      record.usedAt = new Date();
      return true;
    },
    async revoke(id: string, at: Date) {
      const record = [...tokens.values()].find((item) => item.id === id);
      if (record !== undefined) {
        record.revokedAt = at;
      }
    },
    async revokeAllForSession(sessionId: string, at: Date) {
      for (const record of tokens.values()) {
        if (record.sessionId === sessionId) {
          record.revokedAt = at;
        }
      }
    },
  };
}

function makeService() {
  const users = makeUserService();
  const sessions = makeSessionRepository();
  const refreshTokens = makeRefreshRepository();
  const auditEntries: any[] = [];
  const emails: any[] = [];
  let tokenCounter = 0;

  const service = new AuthService({
    users: users as any,
    rbac: {
      getRoleBySlug: async () => ({
        id: 'role-student',
        slug: 'student',
        name: 'Student',
        permissionCodes: ['profile:read', 'profile:write', 'account:security'],
      }),
      getAccessForRoles: async () => ({
        roles: [{ slug: 'student', name: 'Student' }],
        permissions: ['profile:read', 'profile:write', 'account:security'],
      }),
    },
    audit: {
      record: async (entry: any) => {
        auditEntries.push(entry);
      },
    },
    sessions: sessions as any,
    refreshTokens: refreshTokens as any,
    email: {
      send: async (message: any) => {
        emails.push(message);
      },
    },
    passwords: {
      hash: async (password: string) => `hashed:${password}`,
      verify: async (hash: string, password: string) => hash === `hashed:${password}`,
      verifyDummy: async () => false,
    },
    accessTokens: {
      sign: (claims: any) => ({
        token: `access:${claims.userId}:${claims.sessionId}:${claims.tokenVersion}:${++tokenCounter}`,
        expiresIn: 900,
      }),
      verify: (token: string) => {
        const parts = token.replace('access:', '').split(':');
        return { userId: parts[0]!, sessionId: parts[1]!, tokenVersion: Number(parts[2]) };
      },
    },
    options: {
      maxLoginAttempts: 2,
      lockoutBaseMs: 1000,
      lockoutMaxMs: 2000,
      verificationTtlMs: 60_000,
      passwordResetTtlMs: 60_000,
      refreshIdleTtlMs: 60_000,
      refreshAbsoluteTtlMs: 120_000,
    },
  });

  return { service, users, sessions, refreshTokens, auditEntries, emails };
}

describe('AuthService', () => {
  it('registers an unverified user and sends a verification email', async () => {
    const { service, users, emails } = makeService();

    const result = await service.register(
      { name: 'Ada', email: 'Ada@Example.com', password: 'password123456' },
      context,
    );

    expect(result.message).toContain('verify');
    expect(users.users.size).toBe(1);
    expect(emails).toHaveLength(1);
    expect([...users.users.values()][0].status).toBe('pending_verification');
  });

  it('rejects duplicate registration', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );

    await expect(
      service.register(
        { name: 'Ada 2', email: 'ada@example.com', password: 'password123456' },
        context,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_IN_USE',
    });
  });

  it('verifies email with a valid token', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );

    const result = await service.verifyEmail('verification-token', context);

    expect(result.message).toContain('verified');
  });

  it('rejects invalid verification tokens', async () => {
    const { service } = makeService();

    await expect(service.verifyEmail('wrong-token', context)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  it('rejects login before verification', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );

    await expect(
      service.login({ email: 'ada@example.com', password: 'password123456' }, context),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'EMAIL_NOT_VERIFIED',
    });
  });

  it('locks an account after repeated failures', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );
    await service.verifyEmail('verification-token', context);

    await expect(
      service.login({ email: 'ada@example.com', password: 'wrong-password-1' }, context),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(
      service.login({ email: 'ada@example.com', password: 'wrong-password-2' }, context),
    ).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
  });

  it('logs in a verified user and rotates refresh tokens', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );
    await service.verifyEmail('verification-token', context);

    const login = await service.login(
      { email: 'ada@example.com', password: 'password123456' },
      context,
    );
    expect(login.accessToken).toContain('access:');
    expect(login.refreshToken).toBeTruthy();

    const refreshed = await service.refresh(login.refreshToken, context);
    expect(refreshed.accessToken).not.toBe(login.accessToken);

    await expect(service.refresh(login.refreshToken, context)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('revokes all sessions on logout-all', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );
    await service.verifyEmail('verification-token', context);
    const login = await service.login(
      { email: 'ada@example.com', password: 'password123456' },
      context,
    );
    const principal = await service.resolvePrincipal({
      userId: 'user-1',
      sessionId: login.accessToken.split(':')[2]!,
      tokenVersion: 0,
    });

    await service.logoutAll(principal, context);

    await expect(service.refresh(login.refreshToken, context)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('resets a password with a single-use token', async () => {
    const { service, emails } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );
    await service.verifyEmail('verification-token', context);

    const forgot = await service.forgotPassword('ada@example.com', context);
    expect(forgot.message).toContain('reset');
    expect(emails.length).toBeGreaterThan(1);

    const reset = await service.resetPassword('reset-token', 'new-password-123456', context);
    expect(reset.message).toContain('reset');

    await expect(
      service.resetPassword('reset-token', 'another-password-123', context),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });

    const login = await service.login(
      { email: 'ada@example.com', password: 'new-password-123456' },
      context,
    );
    expect(login.accessToken).toContain('access:');
  });

  it('changes password and revokes sessions', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );
    await service.verifyEmail('verification-token', context);
    const login = await service.login(
      { email: 'ada@example.com', password: 'password123456' },
      context,
    );
    const principal = await service.resolvePrincipal({
      userId: 'user-1',
      sessionId: login.accessToken.split(':')[2]!,
      tokenVersion: 0,
    });

    const result = await service.changePassword(
      principal,
      { currentPassword: 'password123456', newPassword: 'new-password-123456' },
      context,
    );
    expect(result.message).toContain('changed');

    await expect(service.refresh(login.refreshToken, context)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('updates and returns the current profile', async () => {
    const { service } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );
    await service.verifyEmail('verification-token', context);
    const login = await service.login(
      { email: 'ada@example.com', password: 'password123456' },
      context,
    );
    const principal = await service.resolvePrincipal({
      userId: 'user-1',
      sessionId: login.accessToken.split(':')[2]!,
      tokenVersion: 0,
    });

    const user = await service.updateProfile(principal, { name: 'Ada Lovelace' }, context);
    expect(user.name).toBe('Ada Lovelace');
  });

  it('rejects resolvePrincipal for a revoked session', async () => {
    const { service, sessions } = makeService();
    await service.register(
      { name: 'Ada', email: 'ada@example.com', password: 'password123456' },
      context,
    );
    await service.verifyEmail('verification-token', context);
    const login = await service.login(
      { email: 'ada@example.com', password: 'password123456' },
      context,
    );
    const sessionId = login.accessToken.split(':')[2]!;

    await sessions.revoke(sessionId, 'test', new Date());

    await expect(
      service.resolvePrincipal({ userId: 'user-1', sessionId, tokenVersion: 0 }),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
