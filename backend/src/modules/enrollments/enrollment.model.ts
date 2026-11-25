import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export type EnrollmentStatus = 'pending_payment' | 'active' | 'expired' | 'revoked';

export interface EnrollmentDocument {
  user: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;
  expiresAt: Date | null;
  pricePaidCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = createBaseSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'active', 'expired', 'revoked'],
      required: true,
      default: 'active',
    },
    expiresAt: { type: Date, default: null },
    pricePaidCents: { type: Number, required: true, min: 0, default: 0 },
  },
  { collection: 'enrollments' },
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ user: 1, status: 1, createdAt: -1 });
enrollmentSchema.index({ course: 1, status: 1 });

export const EnrollmentModel = model<EnrollmentDocument>('Enrollment', enrollmentSchema);

export interface EnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  expiresAt: Date | null;
  pricePaidCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toEnrollmentRecord(
  document: EnrollmentDocument & { _id: Types.ObjectId },
): EnrollmentRecord {
  return {
    id: document._id.toString(),
    userId: document.user.toString(),
    courseId: document.course.toString(),
    status: document.status,
    expiresAt: document.expiresAt,
    pricePaidCents: document.pricePaidCents,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
