import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export type LessonType = 'video' | 'text' | 'pdf' | 'resource';

export interface LessonDocument {
  course: Types.ObjectId;
  section: Types.ObjectId | null;
  title: string;
  type: LessonType;
  content: string | null;
  assetKey: string | null;
  durationSeconds: number | null;
  order: number;
  isPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = createBaseSchema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    section: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    type: { type: String, enum: ['video', 'text', 'pdf', 'resource'], required: true },
    content: { type: String, default: null },
    assetKey: { type: String, default: null },
    durationSeconds: { type: Number, default: null, min: 0 },
    order: { type: Number, required: true, min: 0 },
    isPreview: { type: Boolean, required: true, default: false },
  },
  { collection: 'lessons' },
);

lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ course: 1, section: 1, order: 1 });

export const LessonModel = model<LessonDocument>('Lesson', lessonSchema);

export interface LessonRecord {
  id: string;
  courseId: string;
  sectionId: string | null;
  title: string;
  type: LessonType;
  content: string | null;
  assetKey: string | null;
  durationSeconds: number | null;
  order: number;
  isPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toLessonRecord(document: LessonDocument & { _id: Types.ObjectId }): LessonRecord {
  return {
    id: document._id.toString(),
    courseId: document.course.toString(),
    sectionId: document.section === null ? null : document.section.toString(),
    title: document.title,
    type: document.type,
    content: document.content,
    assetKey: document.assetKey,
    durationSeconds: document.durationSeconds,
    order: document.order,
    isPreview: document.isPreview,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
