import { Schema, type Types, model } from 'mongoose';

import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

export type NotificationCategory = 'announcements' | 'deadlines' | 'grades' | 'system';
export type NotificationType =
  'course_announcement' | 'assignment_due' | 'quiz_reminder' | 'grade_posted' | 'system';
export type EmailDeliveryStatus = 'not_requested' | 'pending' | 'sent' | 'failed';

export interface NotificationDocument {
  user: Types.ObjectId;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  course: Types.ObjectId | null;
  entityType: string | null;
  entityId: string | null;
  dedupeKey: string | null;
  readAt: Date | null;
  emailStatus: EmailDeliveryStatus;
  emailAttempts: number;
  emailLastError: string | null;
  emailSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = createBaseSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['announcements', 'deadlines', 'grades', 'system'],
      required: true,
    },
    type: {
      type: String,
      enum: ['course_announcement', 'assignment_due', 'quiz_reminder', 'grade_posted', 'system'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    link: { type: String, default: null, maxlength: 2_048 },
    course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    entityType: { type: String, default: null, maxlength: 40 },
    entityId: { type: String, default: null, maxlength: 100 },
    dedupeKey: { type: String, default: null, maxlength: 200 },
    readAt: { type: Date, default: null },
    emailStatus: {
      type: String,
      enum: ['not_requested', 'pending', 'sent', 'failed'],
      required: true,
      default: 'not_requested',
    },
    emailAttempts: { type: Number, required: true, default: 0, min: 0 },
    emailLastError: { type: String, default: null, maxlength: 2_000 },
    emailSentAt: { type: Date, default: null },
  },
  { collection: 'notifications' },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ emailStatus: 1, createdAt: 1 });

export const NotificationModel = model<NotificationDocument>('Notification', notificationSchema);

export interface NotificationRecord {
  id: string;
  userId: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  courseId: string | null;
  readAt: Date | null;
  emailStatus: EmailDeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function toNotificationRecord(
  document: NotificationDocument & { _id: Types.ObjectId },
): NotificationRecord {
  return {
    id: document._id.toString(),
    userId: document.user.toString(),
    category: document.category,
    type: document.type,
    title: document.title,
    body: document.body,
    link: document.link,
    courseId: document.course === null ? null : document.course.toString(),
    readAt: document.readAt,
    emailStatus: document.emailStatus,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export interface ChannelPreference {
  inApp: boolean;
  email: boolean;
}

export interface NotificationPreferenceDocument {
  user: Types.ObjectId;
  announcements: ChannelPreference;
  deadlines: ChannelPreference;
  grades: ChannelPreference;
  system: ChannelPreference;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<ChannelPreference>(
  {
    inApp: { type: Boolean, required: true, default: true },
    email: { type: Boolean, required: true, default: true },
  },
  { _id: false },
);

const preferenceSchema = createBaseSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    announcements: {
      type: channelSchema,
      required: true,
      default: () => ({ inApp: true, email: false }),
    },
    deadlines: {
      type: channelSchema,
      required: true,
      default: () => ({ inApp: true, email: true }),
    },
    grades: {
      type: channelSchema,
      required: true,
      default: () => ({ inApp: true, email: true }),
    },
    system: {
      type: channelSchema,
      required: true,
      default: () => ({ inApp: true, email: false }),
    },
  },
  { collection: 'notification_preferences' },
);

export const NotificationPreferenceModel = model<NotificationPreferenceDocument>(
  'NotificationPreference',
  preferenceSchema,
);

export type PreferenceInput = Partial<
  Record<NotificationCategory, Partial<ChannelPreference> | undefined>
>;

export interface NotificationPreferenceView {
  announcements: ChannelPreference;
  deadlines: ChannelPreference;
  grades: ChannelPreference;
  system: ChannelPreference;
}

export function toPreferenceView(
  document: NotificationPreferenceDocument,
): NotificationPreferenceView {
  return {
    announcements: { ...document.announcements },
    deadlines: { ...document.deadlines },
    grades: { ...document.grades },
    system: { ...document.system },
  };
}
