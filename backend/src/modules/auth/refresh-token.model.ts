import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface RefreshTokenDocument {
  session: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = createBaseSchema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { collection: 'refresh_tokens' },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ session: 1, createdAt: -1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model<RefreshTokenDocument>('RefreshToken', refreshTokenSchema);

export interface RefreshTokenRecord {
  id: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toRefreshTokenRecord(
  document: RefreshTokenDocument & { _id: Types.ObjectId },
): RefreshTokenRecord {
  return {
    id: document._id.toString(),
    sessionId: document.session.toString(),
    tokenHash: document.tokenHash,
    expiresAt: document.expiresAt,
    usedAt: document.usedAt ?? null,
    revokedAt: document.revokedAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
