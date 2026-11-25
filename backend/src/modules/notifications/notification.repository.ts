import { Types } from 'mongoose';

import {
  NotificationModel,
  NotificationPreferenceModel,
  toNotificationRecord,
  toPreferenceView,
  type EmailDeliveryStatus,
  type NotificationDocument,
  type NotificationPreferenceDocument,
  type NotificationPreferenceView,
  type NotificationRecord,
  type PreferenceInput,
} from './notification.model.js';

export interface CreateNotificationInput {
  userId: string;
  category: NotificationDocument['category'];
  type: NotificationDocument['type'];
  title: string;
  body: string;
  link?: string | null;
  courseId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
  emailStatus?: EmailDeliveryStatus;
}

type NotificationWithId = NotificationDocument & { _id: Types.ObjectId };

export class NotificationRepository {
  async create(input: CreateNotificationInput): Promise<NotificationRecord | null> {
    try {
      const document = await NotificationModel.create({
        user: new Types.ObjectId(input.userId),
        category: input.category,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        course:
          input.courseId === null || input.courseId === undefined
            ? null
            : new Types.ObjectId(input.courseId),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        emailStatus: input.emailStatus ?? 'not_requested',
      });

      return toNotificationRecord(document);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return null;
      }

      throw error;
    }
  }

  async upsertMany(inputs: readonly CreateNotificationInput[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    const operations = inputs.flatMap((input) => {
      const dedupeKey = input.dedupeKey;

      if (dedupeKey === null || dedupeKey === undefined) {
        return [];
      }

      return [
        {
          updateOne: {
            filter: {
              user: new Types.ObjectId(input.userId),
              dedupeKey,
            },
            update: {
              $setOnInsert: {
                user: new Types.ObjectId(input.userId),
                category: input.category,
                type: input.type,
                title: input.title,
                body: input.body,
                link: input.link ?? null,
                course:
                  input.courseId === null || input.courseId === undefined
                    ? null
                    : new Types.ObjectId(input.courseId),
                entityType: input.entityType ?? null,
                entityId: input.entityId ?? null,
                dedupeKey,
                emailStatus: input.emailStatus ?? 'not_requested',
              },
            },
            upsert: true,
          },
        },
      ];
    });

    const result = await NotificationModel.bulkWrite(operations, { ordered: false });

    return result.upsertedCount;
  }

  async listByUser(userId: string, options: { unreadOnly: boolean; limit: number; skip: number }) {
    const filter = {
      user: new Types.ObjectId(userId),
      ...(options.unreadOnly ? { readAt: null } : {}),
    };

    const documents = (await NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()) as NotificationWithId[];

    return documents.map(toNotificationRecord);
  }

  async countByUser(userId: string, unreadOnly: boolean) {
    return NotificationModel.countDocuments({
      user: new Types.ObjectId(userId),
      ...(unreadOnly ? { readAt: null } : {}),
    });
  }

  findById(id: string): Promise<NotificationWithId | null> {
    return NotificationModel.findById(id).lean();
  }

  async markRead(id: string, userId: string, now: Date): Promise<NotificationRecord | null> {
    const document = (await NotificationModel.findOneAndUpdate(
      { _id: id, user: new Types.ObjectId(userId), readAt: null },
      { $set: { readAt: now } },
      { returnDocument: 'after' },
    ).lean()) as NotificationWithId | null;

    return document === null ? null : toNotificationRecord(document);
  }

  async markAllRead(userId: string, now: Date): Promise<number> {
    const result = await NotificationModel.updateMany(
      { user: new Types.ObjectId(userId), readAt: null },
      { $set: { readAt: now } },
    );

    return result.modifiedCount;
  }

  async setEmailDelivery(
    id: string,
    update: {
      status: EmailDeliveryStatus;
      attempts?: number;
      error?: string | null;
      sentAt?: Date | null;
    },
  ): Promise<void> {
    await NotificationModel.updateOne(
      { _id: id },
      {
        $set: {
          emailStatus: update.status,
          ...(update.attempts !== undefined ? { emailAttempts: update.attempts } : {}),
          emailLastError: update.error ?? null,
          ...(update.sentAt !== undefined ? { emailSentAt: update.sentAt } : {}),
        },
      },
    );
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceView> {
    const document = await NotificationPreferenceModel.findOne({
      user: new Types.ObjectId(userId),
    }).lean();

    return document === null
      ? {
          announcements: { inApp: true, email: false },
          deadlines: { inApp: true, email: true },
          grades: { inApp: true, email: true },
          system: { inApp: true, email: false },
        }
      : toPreferenceView(document);
  }

  async listPreferencesByUsers(
    userIds: readonly string[],
  ): Promise<Map<string, NotificationPreferenceView>> {
    const documents = (await NotificationPreferenceModel.find({
      user: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    }).lean()) as NotificationPreferenceDocument[];

    return new Map(
      documents.map((document) => [document.user.toString(), toPreferenceView(document)]),
    );
  }

  async upsertPreferences(
    userId: string,
    input: PreferenceInput,
  ): Promise<NotificationPreferenceView> {
    const set: Record<string, boolean> = {};

    for (const [category, channels] of Object.entries(input)) {
      if (channels === undefined) {
        continue;
      }

      if (channels.inApp !== undefined) {
        set[`${category}.inApp`] = channels.inApp;
      }
      if (channels.email !== undefined) {
        set[`${category}.email`] = channels.email;
      }
    }

    const document = (await NotificationPreferenceModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { $set: set },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean()) as NotificationPreferenceDocument;

    return toPreferenceView(document);
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export const notificationRepository = new NotificationRepository();
