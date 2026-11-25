import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export type CourseStatus = 'draft' | 'submitted' | 'published' | 'archived';

export interface CourseDocument {
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  instructor: Types.ObjectId;
  category: Types.ObjectId | null;
  tags: string[];
  prerequisites: Types.ObjectId[];
  thumbnailKey: string | null;
  bannerKey: string | null;
  priceCents: number;
  currency: string;
  status: CourseStatus;
  submittedAt: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = createBaseSchema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    shortDescription: { type: String, default: null, trim: true, maxlength: 300 },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    tags: { type: [String], default: [] },
    prerequisites: { type: [{ type: Schema.Types.ObjectId, ref: 'Course' }], default: [] },
    thumbnailKey: { type: String, default: null },
    bannerKey: { type: String, default: null },
    priceCents: { type: Number, required: true, min: 0, default: 0 },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'USD',
      maxlength: 3,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'published', 'archived'],
      required: true,
      default: 'draft',
    },
    submittedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { collection: 'courses' },
);

courseSchema.index({ slug: 1 }, { unique: true });
courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ instructor: 1, status: 1, createdAt: -1 });
courseSchema.index({ category: 1, status: 1, createdAt: -1 });
courseSchema.index({ tags: 1, status: 1 });

export const CourseModel = model<CourseDocument>('Course', courseSchema);

export interface CourseRecord {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  instructorId: string;
  categoryId: string | null;
  tags: string[];
  prerequisiteIds: string[];
  thumbnailKey: string | null;
  bannerKey: string | null;
  priceCents: number;
  currency: string;
  status: CourseStatus;
  submittedAt: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toCourseRecord(document: CourseDocument & { _id: Types.ObjectId }): CourseRecord {
  return {
    id: document._id.toString(),
    title: document.title,
    slug: document.slug,
    description: document.description,
    shortDescription: document.shortDescription,
    instructorId: document.instructor.toString(),
    categoryId: document.category === null ? null : document.category.toString(),
    tags: document.tags,
    prerequisiteIds: document.prerequisites.map((id) => id.toString()),
    thumbnailKey: document.thumbnailKey,
    bannerKey: document.bannerKey,
    priceCents: document.priceCents,
    currency: document.currency,
    status: document.status,
    submittedAt: document.submittedAt,
    publishedAt: document.publishedAt,
    archivedAt: document.archivedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
