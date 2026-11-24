import { Types } from 'mongoose';

import { escapeRegExp } from '../../shared/query/filtering.js';
import { UserModel, type UserDocument } from './user.model.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  status: 'pending_verification' | 'active' | 'suspended';
  roleIds: string[];
  emailVerifiedAt: Date | null;
  passwordChangedAt: Date;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockoutLevel: number;
  lockUntil: Date | null;
  tokenVersion: number;
  instructorApplicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAuthRecord extends UserRecord {
  passwordHash: string;
}

export interface EmailVerificationState {
  tokenHash: string;
  expiresAt: Date;
  sentAt: Date;
}

export interface PasswordResetState {
  tokenHash: string;
  expiresAt: Date;
  requestedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
  emailVerification: EmailVerificationState;
}

export interface FailedLoginUpdate {
  failedLoginAttempts: number;
  lockoutLevel: number;
  lockUntil: Date | null;
}

export class UserRepository {
  async create(input: CreateUserInput): Promise<UserRecord | null> {
    try {
      const document = await UserModel.create({
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        roles: [new Types.ObjectId(input.roleId)],
        status: 'pending_verification',
        emailVerification: {
          tokenHash: input.emailVerification.tokenHash,
          expiresAt: input.emailVerification.expiresAt,
          sentAt: input.emailVerification.sentAt,
        },
      });

      return toUserRecord(document);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return null;
      }

      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const document = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
    return document === null ? null : toUserRecordFromLean(document);
  }

  async findByEmailWithPassword(email: string): Promise<UserAuthRecord | null> {
    const document = await UserModel.findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .lean();

    if (document === null || typeof document.passwordHash !== 'string') {
      return null;
    }

    return {
      ...toUserRecordFromLean(document),
      passwordHash: document.passwordHash,
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const document = await UserModel.findById(id).lean();
    return document === null ? null : toUserRecordFromLean(document);
  }

  async findByIdWithPassword(id: string): Promise<UserAuthRecord | null> {
    const document = await UserModel.findById(id).select('+passwordHash').lean();

    if (document === null || typeof document.passwordHash !== 'string') {
      return null;
    }

    return {
      ...toUserRecordFromLean(document),
      passwordHash: document.passwordHash,
    };
  }

  async setEmailVerification(id: string, state: EmailVerificationState): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      {
        $set: {
          emailVerification: {
            tokenHash: state.tokenHash,
            expiresAt: state.expiresAt,
            sentAt: state.sentAt,
          },
        },
      },
    );
  }

  async markEmailVerified(tokenHash: string, now: Date): Promise<UserRecord | null> {
    const document = await UserModel.findOneAndUpdate(
      {
        'emailVerification.tokenHash': tokenHash,
        'emailVerification.expiresAt': { $gt: now },
        status: 'pending_verification',
      },
      {
        $set: {
          status: 'active',
          emailVerifiedAt: now,
        },
        $unset: {
          emailVerification: 1,
        },
      },
      { returnDocument: 'after' },
    ).lean();

    return document === null ? null : toUserRecordFromLean(document);
  }

  async setPasswordReset(email: string, state: PasswordResetState): Promise<UserRecord | null> {
    const document = await UserModel.findOneAndUpdate(
      {
        email: email.toLowerCase().trim(),
        status: { $in: ['pending_verification', 'active'] },
      },
      {
        $set: {
          passwordReset: {
            tokenHash: state.tokenHash,
            expiresAt: state.expiresAt,
            requestedAt: state.requestedAt,
          },
        },
      },
      { returnDocument: 'after' },
    ).lean();

    return document === null ? null : toUserRecordFromLean(document);
  }

  async resetPasswordWithToken(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<UserRecord | null> {
    const document = await UserModel.findOneAndUpdate(
      {
        'passwordReset.tokenHash': tokenHash,
        'passwordReset.expiresAt': { $gt: now },
      },
      {
        $set: {
          passwordHash,
          passwordChangedAt: now,
          status: 'active',
          emailVerifiedAt: now,
          failedLoginAttempts: 0,
          lockoutLevel: 0,
        },
        $unset: {
          passwordReset: 1,
          lockUntil: 1,
        },
        $inc: {
          tokenVersion: 1,
        },
      },
      { returnDocument: 'after' },
    ).lean();

    if (document === null || typeof document.passwordHash !== 'undefined') {
      // lean result may include passwordHash only when selected; ignore.
    }

    return document === null ? null : toUserRecordFromLean(document);
  }

  async updatePassword(id: string, passwordHash: string, now: Date): Promise<UserRecord | null> {
    const document = await UserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          passwordHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockoutLevel: 0,
        },
        $unset: {
          lockUntil: 1,
        },
        $inc: {
          tokenVersion: 1,
        },
      },
      { returnDocument: 'after' },
    ).lean();

    return document === null ? null : toUserRecordFromLean(document);
  }

  async recordLoginSuccess(id: string, now: Date): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      {
        $set: {
          lastLoginAt: now,
          failedLoginAttempts: 0,
          lockoutLevel: 0,
        },
        $unset: {
          lockUntil: 1,
        },
      },
    );
  }

  async recordFailedLogin(
    id: string,
    now: Date,
    options: { maxAttempts: number; baseMs: number; maxMs: number },
  ): Promise<FailedLoginUpdate | null> {
    const incremented = await UserModel.findByIdAndUpdate(
      id,
      { $inc: { failedLoginAttempts: 1 } },
      { returnDocument: 'after' },
    ).lean();

    if (incremented === null) {
      return null;
    }

    const failed = incremented.failedLoginAttempts;

    if (failed < options.maxAttempts) {
      return {
        failedLoginAttempts: failed,
        lockoutLevel: incremented.lockoutLevel,
        lockUntil: incremented.lockUntil ?? null,
      };
    }

    const nextLevel = incremented.lockoutLevel + 1;
    const duration = Math.min(options.baseMs * 2 ** (nextLevel - 1), options.maxMs);
    const lockUntil = new Date(now.getTime() + duration);

    const locked = await UserModel.findOneAndUpdate(
      { _id: id, failedLoginAttempts: { $gte: options.maxAttempts } },
      {
        $set: {
          failedLoginAttempts: 0,
          lockoutLevel: nextLevel,
          lockUntil,
        },
      },
      { returnDocument: 'after' },
    ).lean();

    if (locked === null) {
      return {
        failedLoginAttempts: failed,
        lockoutLevel: incremented.lockoutLevel,
        lockUntil: incremented.lockUntil ?? null,
      };
    }

    return {
      failedLoginAttempts: 0,
      lockoutLevel: nextLevel,
      lockUntil,
    };
  }

  async updateName(id: string, name: string): Promise<UserRecord | null> {
    const document = await UserModel.findByIdAndUpdate(
      id,
      { $set: { name } },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    return document === null ? null : toUserRecordFromLean(document);
  }

  async list(input: {
    page: number;
    limit: number;
    sortField: 'createdAt' | 'name' | 'email' | 'status';
    sortDirection: 'asc' | 'desc';
    status?: 'pending_verification' | 'active' | 'suspended' | undefined;
    roleId?: string | undefined;
    applicationStatus?: 'none' | 'pending' | 'approved' | 'rejected' | undefined;
    search?: string | undefined;
    includeDeleted?: boolean | undefined;
  }): Promise<{ items: UserRecord[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (input.includeDeleted !== true) {
      filter.deletedAt = null;
    }

    if (input.status !== undefined) {
      filter.status = input.status;
    }

    if (input.roleId !== undefined) {
      filter.roles = new Types.ObjectId(input.roleId);
    }

    if (input.applicationStatus !== undefined) {
      filter.instructorApplicationStatus = input.applicationStatus;
    }

    if (input.search !== undefined && input.search.trim() !== '') {
      const regex = new RegExp(escapeRegExp(input.search.trim()), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const sort: Record<string, 1 | -1> = {
      [input.sortField]: input.sortDirection === 'asc' ? 1 : -1,
    };

    const [documents, total] = await Promise.all([
      UserModel.find(filter)
        .sort(sort)
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return {
      items: (documents as UserLean[]).map(toUserRecordFromLean),
      total,
    };
  }

  async update(
    id: string,
    input: {
      name?: string;
      email?: string;
      status?: 'pending_verification' | 'active' | 'suspended';
      roleIds?: string[];
      instructorApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    },
  ): Promise<UserRecord | null> {
    const update: Record<string, unknown> = {};

    if (input.name !== undefined) {
      update.name = input.name;
    }

    if (input.email !== undefined) {
      update.email = input.email.toLowerCase().trim();
    }

    if (input.status !== undefined) {
      update.status = input.status;
    }

    if (input.roleIds !== undefined) {
      update.roles = input.roleIds.map((roleId) => new Types.ObjectId(roleId));
    }

    if (input.instructorApplicationStatus !== undefined) {
      update.instructorApplicationStatus = input.instructorApplicationStatus;
    }

    const document = await UserModel.findByIdAndUpdate(
      id,
      { $set: update },
      { runValidators: true, returnDocument: 'after' },
    ).lean();

    return document === null ? null : toUserRecordFromLean(document);
  }

  async softDelete(id: string, deletedBy: string, now: Date): Promise<UserRecord | null> {
    const document = await UserModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: now, deletedBy: new Types.ObjectId(deletedBy), status: 'suspended' } },
      { returnDocument: 'after' },
    ).lean();

    return document === null ? null : toUserRecordFromLean(document);
  }

  async restore(id: string): Promise<UserRecord | null> {
    const document = await UserModel.findByIdAndUpdate(
      id,
      { $set: { deletedAt: null, deletedBy: null } },
      { returnDocument: 'after' },
    ).lean();

    return document === null ? null : toUserRecordFromLean(document);
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  }
}

function toUserRecord(document: UserDocument & { _id: Types.ObjectId }): UserRecord {
  return {
    id: document._id.toString(),
    name: document.name,
    email: document.email,
    status: document.status,
    roleIds: (document.roles ?? []).map((role) => role.toString()),
    emailVerifiedAt: document.emailVerifiedAt ?? null,
    passwordChangedAt: document.passwordChangedAt,
    lastLoginAt: document.lastLoginAt ?? null,
    failedLoginAttempts: document.failedLoginAttempts,
    lockoutLevel: document.lockoutLevel,
    lockUntil: document.lockUntil ?? null,
    tokenVersion: document.tokenVersion,
    instructorApplicationStatus: document.instructorApplicationStatus,
    deletedAt: document.deletedAt ?? null,
    deletedBy: document.deletedBy?.toString() ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

interface UserLean {
  _id: Types.ObjectId;
  name: string;
  email: string;
  status: 'pending_verification' | 'active' | 'suspended';
  roles?: Types.ObjectId[];
  emailVerifiedAt?: Date | null;
  passwordChangedAt: Date;
  lastLoginAt?: Date | null;
  failedLoginAttempts: number;
  lockoutLevel: number;
  lockUntil?: Date | null;
  tokenVersion: number;
  instructorApplicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

function toUserRecordFromLean(document: UserLean): UserRecord {
  return {
    id: document._id.toString(),
    name: document.name,
    email: document.email,
    status: document.status,
    roleIds: (document.roles ?? []).map((role) => role.toString()),
    emailVerifiedAt: document.emailVerifiedAt ?? null,
    passwordChangedAt: document.passwordChangedAt,
    lastLoginAt: document.lastLoginAt ?? null,
    failedLoginAttempts: document.failedLoginAttempts,
    lockoutLevel: document.lockoutLevel,
    lockUntil: document.lockUntil ?? null,
    tokenVersion: document.tokenVersion,
    instructorApplicationStatus: document.instructorApplicationStatus,
    deletedAt: document.deletedAt ?? null,
    deletedBy: document.deletedBy?.toString() ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
