import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface SectionDocument {
  course: Types.ObjectId;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = createBaseSchema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    order: { type: Number, required: true, min: 0 },
  },
  { collection: 'sections' },
);

sectionSchema.index({ course: 1, order: 1 });

export const SectionModel = model<SectionDocument>('Section', sectionSchema);

export interface SectionRecord {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

export function toSectionRecord(
  document: SectionDocument & { _id: Types.ObjectId },
): SectionRecord {
  return {
    id: document._id.toString(),
    courseId: document.course.toString(),
    title: document.title,
    order: document.order,
  };
}
