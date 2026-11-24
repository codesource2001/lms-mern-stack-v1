import { AppError } from '../../shared/errors/app-error.js';
import { createOpaqueToken, hashOpaqueToken } from '../../shared/security/opaque-token.js';
import {
  UserRepository,
  type UserRecord,
  type UserAuthRecord,
  type FailedLoginUpdate,
} from './user.repository.js';

export interface UserServiceOptions {
  verificationTtlMs: number;
  passwordResetTtlMs: number;
  maxLoginAttempts: number;
  lockoutBaseMs: number;
  lockoutMaxMs: number;
}

const defaultOptions: UserServiceOptions = {
  verificationTtlMs: 24 * 60 * 60 * 1000,
  passwordResetTtlMs: 30 * 60 * 60 * 1000,
  maxLoginAttempts: 5,
  lockoutBaseMs: 15 * 60 * 1000,
  lockoutMaxMs: 24 * 60 * 60 * 1000,
};

export class UserService {
  private readonly options: UserServiceOptions;

  constructor(
    private readonly repository: UserRepository,
    options: UserServiceOptions | undefined = defaultOptions,
    private readonly revokeSessions?: (userId: string, reason: string, now: Date) => Promise<void>,
  ) {
    this.options = options;
  }

  get verificationTtlMs(): number {
    return this.options.verificationTtlMs;
  }

  get passwordResetTtlMs(): number {
    return this.options.passwordResetTtlMs;
  }

  get lockoutOptions() {
    return {
      maxAttempts: this.options.maxLoginAttempts,
      baseMs: this.options.lockoutBaseMs,
      maxMs: this.options.lockoutMaxMs,
    };
  }

  async createUnverifiedUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    roleId: string;
  }): Promise<{ user: UserRecord; verificationToken: string }> {
    const verificationToken = createOpaqueToken('atr_ev');
    const now = new Date();

    const user = await this.repository.create({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      roleId: input.roleId,
      emailVerification: {
        tokenHash: hashOpaqueToken(verificationToken),
        expiresAt: new Date(now.getTime() + this.verificationTtlMs),
        sentAt: now,
      },
    });

    if (user === null) {
      throw new AppError('An account with this email already exists', {
        statusCode: 409,
        code: 'EMAIL_IN_USE',
      });
    }

    return { user, verificationToken };
  }

  async issueVerificationToken(userId: string): Promise<string> {
    const verificationToken = createOpaqueToken('atr_ev');
    const now = new Date();

    await this.repository.setEmailVerification(userId, {
      tokenHash: hashOpaqueToken(verificationToken),
      expiresAt: new Date(now.getTime() + this.verificationTtlMs),
      sentAt: now,
    });

    return verificationToken;
  }

  async findForLogin(email: string): Promise<UserAuthRecord | null> {
    return this.repository.findByEmailWithPassword(email);
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.repository.findById(id);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.repository.findByEmail(email);
  }

  async findByIdWithPassword(id: string): Promise<UserAuthRecord | null> {
    return this.repository.findByIdWithPassword(id);
  }

  async markEmailVerified(token: string, now: Date): Promise<UserRecord | null> {
    return this.repository.markEmailVerified(hashOpaqueToken(token), now);
  }

  async requestPasswordReset(
    email: string,
    now: Date,
  ): Promise<{ user: UserRecord; token: string } | null> {
    const user = await this.repository.findByEmail(email);

    if (user === null || user.status === 'suspended') {
      return null;
    }

    const token = createOpaqueToken('atr_pr');
    const updated = await this.repository.setPasswordReset(user.email, {
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(now.getTime() + this.passwordResetTtlMs),
      requestedAt: now,
    });

    if (updated === null) {
      return null;
    }

    return { user: updated, token };
  }

  async resetPasswordWithToken(
    token: string,
    passwordHash: string,
    now: Date,
  ): Promise<UserRecord | null> {
    return this.repository.resetPasswordWithToken(hashOpaqueToken(token), passwordHash, now);
  }

  async updatePassword(id: string, passwordHash: string, now: Date): Promise<UserRecord | null> {
    return this.repository.updatePassword(id, passwordHash, now);
  }

  async recordLoginSuccess(id: string, now: Date): Promise<void> {
    await this.repository.recordLoginSuccess(id, now);
  }

  async recordFailedLogin(id: string, now: Date): Promise<FailedLoginUpdate | null> {
    return this.repository.recordFailedLogin(id, now, {
      maxAttempts: this.options.maxLoginAttempts,
      baseMs: this.options.lockoutBaseMs,
      maxMs: this.options.lockoutMaxMs,
    });
  }

  async updateName(id: string, name: string): Promise<UserRecord | null> {
    return this.repository.updateName(id, name);
  }

  async list(
    input: Parameters<UserRepository['list']>[0],
  ): Promise<{ items: UserRecord[]; total: number }> {
    return this.repository.list(input);
  }

  async updateUser(
    id: string,
    input: {
      name?: string;
      email?: string;
      status?: 'pending_verification' | 'active' | 'suspended';
      roleIds?: string[];
      instructorApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    },
  ): Promise<UserRecord | null> {
    return this.repository.update(id, input);
  }

  async suspend(id: string, _actorId: string, now: Date): Promise<UserRecord | null> {
    const user = await this.repository.update(id, { status: 'suspended' });
    if (user !== null) {
      await this.repository.incrementTokenVersion(id);
      await this.revokeSessions?.(id, 'user_suspended', now);
    }
    return user;
  }

  async reactivate(id: string): Promise<UserRecord | null> {
    return this.repository.update(id, { status: 'active' });
  }

  async softDelete(id: string, _actorId: string, now: Date): Promise<UserRecord | null> {
    const result = await this.repository.softDelete(id, _actorId, now);
    if (result !== null) {
      await this.repository.incrementTokenVersion(id);
      await this.revokeSessions?.(id, 'user_deleted', now);
    }
    return result;
  }

  async restore(id: string): Promise<UserRecord | null> {
    return this.repository.restore(id);
  }

  async applyInstructorApplication(id: string): Promise<UserRecord | null> {
    return this.repository.update(id, { instructorApplicationStatus: 'pending' });
  }

  async approveInstructorApplication(id: string, roleId: string): Promise<UserRecord | null> {
    return this.repository.update(id, {
      instructorApplicationStatus: 'approved',
      roleIds: [roleId],
      status: 'active',
    });
  }

  async rejectInstructorApplication(id: string): Promise<UserRecord | null> {
    return this.repository.update(id, { instructorApplicationStatus: 'rejected' });
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.repository.incrementTokenVersion(id);
  }
}

export const userRepository = new UserRepository();
export const userService = new UserService(
  userRepository,
  {
    verificationTtlMs: 24 * 60 * 60 * 1000,
    passwordResetTtlMs: 30 * 60 * 1000,
    maxLoginAttempts: 5,
    lockoutBaseMs: 15 * 60 * 60 * 1000,
    lockoutMaxMs: 24 * 60 * 60 * 1000,
  },
  async (userId, reason, now) => {
    const { sessionRepository } = await import('../auth/auth.repository.js');
    await sessionRepository.revokeAllForUser(userId, reason, now);
  },
);
