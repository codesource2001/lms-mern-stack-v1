import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface CertificateDocument {
  certificateId: string;
  user: Types.ObjectId;
  course: Types.ObjectId;
  recipientName: string;
  courseTitle: string;
  issuedAt: Date;
  active: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  revokedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = createBaseSchema(
  {
    certificateId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    courseTitle: { type: String, required: true, trim: true, maxlength: 180 },
    issuedAt: { type: Date, required: true, default: Date.now },
    active: { type: Boolean, required: true, default: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null, maxlength: 300 },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'certificates' },
);

// Exactly one active certificate per learner and course. Revoked certificates
// remain as an audit trail but drop out of the partial index.
certificateSchema.index(
  { user: 1, course: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
certificateSchema.index({ user: 1, issuedAt: -1 });

export const CertificateModel = model<CertificateDocument>('Certificate', certificateSchema);

export interface CertificateRecord {
  id: string;
  certificateId: string;
  userId: string;
  courseId: string;
  recipientName: string;
  courseTitle: string;
  issuedAt: Date;
  active: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  revokedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toCertificateRecord(
  document: CertificateDocument & { _id: Types.ObjectId },
): CertificateRecord {
  return {
    id: document._id.toString(),
    certificateId: document.certificateId,
    userId: document.user.toString(),
    courseId: document.course.toString(),
    recipientName: document.recipientName,
    courseTitle: document.courseTitle,
    issuedAt: document.issuedAt,
    active: document.active,
    revokedAt: document.revokedAt,
    revokedReason: document.revokedReason,
    revokedById: document.revokedBy === null ? null : document.revokedBy.toString(),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
