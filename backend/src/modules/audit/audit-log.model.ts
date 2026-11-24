import { Schema, Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export type AuditResult = 'success' | 'failure';

export interface AuditLogDocument {
  actor: Types.ObjectId | null;
  action: string;
  result: AuditResult;
  targetType: string | null;
  targetId: string | null;
  ipHash: string | null;
  userAgentHash: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = createBaseSchema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    result: { type: String, enum: ['success', 'failure'], required: true },
    targetType: { type: String, default: null, maxlength: 60 },
    targetId: { type: String, default: null, maxlength: 120 },
    ipHash: { type: String, default: null, maxlength: 128 },
    userAgentHash: { type: String, default: null, maxlength: 128 },
    requestId: { type: String, default: null, maxlength: 128 },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { collection: 'audit_logs' },
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model<AuditLogDocument>('AuditLog', auditLogSchema);

export interface AuditLogEntry {
  actorUserId: string | null;
  action: string;
  result: AuditResult;
  targetType?: string;
  targetId?: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditRepository {
  create(entry: AuditLogEntry): Promise<void>;
}

export class MongoAuditRepository implements AuditRepository {
  async create(entry: AuditLogEntry): Promise<void> {
    await AuditLogModel.create({
      actor: entry.actorUserId === null ? null : new Types.ObjectId(entry.actorUserId),
      action: entry.action,
      result: entry.result,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      ipHash: entry.ipHash ?? null,
      userAgentHash: entry.userAgentHash ?? null,
      requestId: entry.requestId ?? null,
      metadata: entry.metadata ?? null,
    });
  }
}

export const auditRepository = new MongoAuditRepository();
