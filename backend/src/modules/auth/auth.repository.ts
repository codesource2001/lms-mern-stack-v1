import { Types } from 'mongoose';

import { RefreshTokenModel, type RefreshTokenDocument } from './refresh-token.model.js';
import { SessionModel, type SessionRecord, toSessionRecord } from './session.model.js';

export interface CreateSessionInput {
  userId: string;
  tokenVersion: number;
  userAgentHash: string;
  ipHash: string;
  expiresAt: Date;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<SessionRecord>;
  findById(id: string): Promise<SessionRecord | null>;
  revoke(id: string, reason: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, reason: string, at: Date): Promise<void>;
  touch(id: string, at: Date): Promise<void>;
}

export interface CreateRefreshTokenInput {
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<{ id: string; sessionId: string }>;
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

export class MongoSessionRepository implements SessionRepository {
  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const document = await SessionModel.create({
      user: new Types.ObjectId(input.userId),
      tokenVersion: input.tokenVersion,
      userAgentHash: input.userAgentHash,
      ipHash: input.ipHash,
      lastUsedAt: new Date(),
      expiresAt: input.expiresAt,
    });

    return toSessionRecord(document);
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const document = await SessionModel.findById(id).lean();
    return document === null ? null : toSessionRecord(document);
  }

  async revoke(id: string, reason: string, at: Date): Promise<void> {
    await SessionModel.updateOne(
      { _id: id, revokedAt: null },
      { $set: { revokedAt: at, revokedReason: reason } },
    );
  }

  async revokeAllForUser(userId: string, reason: string, at: Date): Promise<void> {
    await SessionModel.updateMany(
      { user: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: at, revokedReason: reason } },
    );
  }

  async touch(id: string, at: Date): Promise<void> {
    await SessionModel.updateOne({ _id: id }, { $set: { lastUsedAt: at } });
  }
}

export class MongoRefreshTokenRepository implements RefreshTokenRepository {
  async create(input: CreateRefreshTokenInput): Promise<{ id: string; sessionId: string }> {
    const document = await RefreshTokenModel.create({
      session: new Types.ObjectId(input.sessionId),
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });

    return {
      id: document._id.toString(),
      sessionId: document.session.toString(),
    };
  }

  async findByHash(hash: string): Promise<{
    id: string;
    sessionId: string;
    expiresAt: Date;
    usedAt: Date | null;
    revokedAt: Date | null;
  } | null> {
    const document = await RefreshTokenModel.findOne({ tokenHash: hash })
      .select('+tokenHash')
      .lean();

    if (document === null) {
      return null;
    }

    const record = document as RefreshTokenDocument & { _id: Types.ObjectId };
    return {
      id: record._id.toString(),
      sessionId: record.session.toString(),
      expiresAt: record.expiresAt,
      usedAt: record.usedAt ?? null,
      revokedAt: record.revokedAt ?? null,
    };
  }

  async markUsed(id: string, at: Date): Promise<boolean> {
    const result = await RefreshTokenModel.updateOne(
      { _id: id, usedAt: null, revokedAt: null },
      { $set: { usedAt: at } },
    );

    return result.modifiedCount === 1;
  }

  async revoke(id: string, at: Date): Promise<void> {
    await RefreshTokenModel.updateOne({ _id: id }, { $set: { revokedAt: at } });
  }

  async revokeAllForSession(sessionId: string, at: Date): Promise<void> {
    await RefreshTokenModel.updateMany(
      { session: new Types.ObjectId(sessionId) },
      { $set: { revokedAt: at } },
    );
  }
}

export const sessionRepository = new MongoSessionRepository();
export const refreshTokenRepository = new MongoRefreshTokenRepository();
