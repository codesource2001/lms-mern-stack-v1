import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface SubmissionDocument {
  assignment: Types.ObjectId;
  user: Types.ObjectId;
  version: number;
  fileKey: string | null;
  content: string | null;
  submittedAt: Date;
  isLate: boolean;
  grade: number | null;
  feedback: string | null;
  gradedBy: Types.ObjectId | null;
  gradedAt: Date | null;
  status: 'submitted' | 'graded' | 'returned';
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = createBaseSchema(
  {
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, required: true, min: 1 },
    fileKey: { type: String, default: null },
    content: { type: String, default: null, maxlength: 20000 },
    submittedAt: { type: Date, required: true, default: Date.now },
    isLate: { type: Boolean, required: true, default: false },
    grade: { type: Number, default: null, min: 0 },
    feedback: { type: String, default: null, maxlength: 5000 },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned'],
      required: true,
      default: 'submitted',
    },
  },
  { collection: 'submissions' },
);

submissionSchema.index({ assignment: 1, user: 1, version: -1 });
submissionSchema.index({ assignment: 1, status: 1, submittedAt: -1 });
submissionSchema.index({ user: 1, submittedAt: -1 });

export const SubmissionModel = model<SubmissionDocument>('Submission', submissionSchema);

export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  userId: string;
  version: number;
  fileKey: string | null;
  content: string | null;
  submittedAt: Date;
  isLate: boolean;
  grade: number | null;
  feedback: string | null;
  gradedById: string | null;
  gradedAt: Date | null;
  status: 'submitted' | 'graded' | 'returned';
  createdAt: Date;
  updatedAt: Date;
}

export function toSubmissionRecord(
  document: SubmissionDocument & { _id: Types.ObjectId },
): SubmissionRecord {
  return {
    id: document._id.toString(),
    assignmentId: document.assignment.toString(),
    userId: document.user.toString(),
    version: document.version,
    fileKey: document.fileKey,
    content: document.content,
    submittedAt: document.submittedAt,
    isLate: document.isLate,
    grade: document.grade,
    feedback: document.feedback,
    gradedById: document.gradedBy === null ? null : document.gradedBy.toString(),
    gradedAt: document.gradedAt,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
