import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface SessionDocument {
  user: Types.ObjectId;
  tokenVersion: number;
  userAgentHash: string;
  ipHash: string;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = createBaseSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenVersion: { type: Number, required: true, min: 0 },
    userAgentHash: { type: String, required: true, maxlength: 128 },
    ipHash: { type: String, required: true, maxlength: 128 },
    lastUsedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null, maxlength: 80 },
  },
  { collection: 'sessions' },
);

sessionSchema.index({ user: 1, revokedAt: 1, expiresAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<SessionDocument>('Session', sessionSchema);

export interface SessionRecord {
  id: string;
  userId: string;
  tokenVersion: number;
  userAgentHash: string;
  ipHash: string;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSessionRecord(
  document: SessionDocument & { _id: Types.ObjectId },
): SessionRecord {
  return {
    id: document._id.toString(),
    userId: document.user.toString(),
    tokenVersion: document.tokenVersion,
    userAgentHash: document.userAgentHash,
    ipHash: document.ipHash,
    lastUsedAt: document.lastUsedAt,
    expiresAt: document.expiresAt,
    revokedAt: document.revokedAt ?? null,
    revokedReason: document.revokedReason ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
