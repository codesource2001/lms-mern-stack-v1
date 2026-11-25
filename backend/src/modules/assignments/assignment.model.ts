import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface AssignmentDocument {
  course: Types.ObjectId;
  title: string;
  description: string;
  dueAt: Date | null;
  maxScore: number;
  status: 'draft' | 'published';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = createBaseSchema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    dueAt: { type: Date, default: null },
    maxScore: { type: Number, required: true, min: 1, max: 1000, default: 100 },
    status: { type: String, enum: ['draft', 'published'], required: true, default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { collection: 'assignments' },
);

assignmentSchema.index({ course: 1, status: 1, dueAt: 1 });

export const AssignmentModel = model<AssignmentDocument>('Assignment', assignmentSchema);

export interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueAt: Date | null;
  maxScore: number;
  status: 'draft' | 'published';
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toAssignmentRecord(
  document: AssignmentDocument & { _id: Types.ObjectId },
): AssignmentRecord {
  return {
    id: document._id.toString(),
    courseId: document.course.toString(),
    title: document.title,
    description: document.description,
    dueAt: document.dueAt,
    maxScore: document.maxScore,
    status: document.status,
    createdById: document.createdBy.toString(),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
