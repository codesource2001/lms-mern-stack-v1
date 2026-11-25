import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export interface AnnouncementDocument {
  course: Types.ObjectId;
  author: Types.ObjectId;
  title: string;
  body: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = createBaseSchema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 180 },
    body: { type: String, required: true, trim: true, maxlength: 10_000 },
    publishedAt: { type: Date, required: true, default: Date.now },
  },
  { collection: 'announcements' },
);

announcementSchema.index({ course: 1, publishedAt: -1 });

export const AnnouncementModel = model<AnnouncementDocument>('Announcement', announcementSchema);

export interface AnnouncementRecord {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toAnnouncementRecord(
  document: AnnouncementDocument & { _id: Types.ObjectId },
): AnnouncementRecord {
  return {
    id: document._id.toString(),
    courseId: document.course.toString(),
    authorId: document.author.toString(),
    title: document.title,
    body: document.body,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
