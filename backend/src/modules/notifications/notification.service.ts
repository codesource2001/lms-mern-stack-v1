import { AppError } from '../../shared/errors/app-error.js';
import {
  emailService,
  notificationEmailTemplate,
} from '../../infrastructure/email/email.service.js';
import { jobQueue } from '../../infrastructure/jobs/job-queue.js';
import { assignmentService } from '../assignments/assignment.service.js';
import { enrollmentService } from '../enrollments/enrollment.service.js';
import { userService } from '../users/user.service.js';
import { notificationRepository } from './notification.repository.js';
import type { CreateNotificationInput, NotificationRepository } from './notification.repository.js';
import type { NotificationPreferenceView, PreferenceInput } from './notification.model.js';

const MAX_PAGE_SIZE = 100;
const MAX_REMINDER_ASSIGNMENTS = 100;
const MAX_REMINDER_RECIPIENTS_PER_COURSE = 1_000;
const MAX_REMINDER_NOTIFICATIONS = 2_000;

export interface NotificationQuery {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationListResult {
  items: Awaited<ReturnType<NotificationRepository['listByUser']>>;
  total: number;
  page: number;
  limit: number;
}

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly queue: typeof jobQueue,
  ) {}

  async create(input: CreateNotificationInput & { sendEmail?: boolean }) {
    const preferences = await this.repository.getPreferences(input.userId);
    const channel = preferences[input.category];

    if (!channel.inApp) {
      return null;
    }

    const emailRequested = channel.email && input.sendEmail !== false;
    const notification = await this.repository.create({
      ...input,
      emailStatus: emailRequested ? 'pending' : 'not_requested',
    });

    if (notification !== null && emailRequested) {
      await this.enqueueEmail(notification.id);
    }

    return notification;
  }

  async createBatch(inputs: readonly (CreateNotificationInput & { sendEmail?: boolean })[]) {
    let created = 0;

    for (const input of inputs) {
      const notification = await this.create(input);
      if (notification !== null) {
        created += 1;
      }
    }

    return created;
  }

  async list(userId: string, query: NotificationQuery): Promise<NotificationListResult> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, MAX_PAGE_SIZE);

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
      throw new AppError('Invalid pagination parameters', {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const unreadOnly = query.unreadOnly ?? false;
    const [items, total] = await Promise.all([
      this.repository.listByUser(userId, {
        unreadOnly,
        limit,
        skip: (page - 1) * limit,
      }),
      this.repository.countByUser(userId, unreadOnly),
    ]);

    return { items, total, page, limit };
  }

  async countUnread(userId: string): Promise<number> {
    return this.repository.countByUser(userId, true);
  }

  async markRead(id: string, userId: string, now: Date = new Date()) {
    const notification = await this.repository.markRead(id, userId, now);

    if (notification === null) {
      throw new AppError('Notification not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return notification;
  }

  async markAllRead(userId: string, now: Date = new Date()): Promise<number> {
    return this.repository.markAllRead(userId, now);
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceView> {
    return this.repository.getPreferences(userId);
  }

  async updatePreferences(userId: string, input: PreferenceInput) {
    return this.repository.upsertPreferences(userId, input);
  }

  async deliverEmail(notificationId: string): Promise<void> {
    const notification = await this.repository.findById(notificationId);

    if (notification === null) {
      return;
    }

    if (notification.emailStatus === 'sent' || notification.emailStatus === 'not_requested') {
      return;
    }

    const user = await userService.findById(notification.user.toString());

    if (user === null) {
      await this.repository.setEmailDelivery(notificationId, {
        status: 'failed',
        attempts: notification.emailAttempts + 1,
        error: 'Recipient not found',
      });
      return;
    }

    const message = notificationEmailTemplate({
      name: user.name,
      title: notification.title,
      body: notification.body,
      link: notification.link,
    });
    message.to = user.email;

    try {
      await emailService.send(message);
      await this.repository.setEmailDelivery(notificationId, {
        status: 'sent',
        attempts: notification.emailAttempts + 1,
        sentAt: new Date(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Email delivery failed';
      await this.repository.setEmailDelivery(notificationId, {
        status: 'failed',
        attempts: notification.emailAttempts + 1,
        error: reason,
      });
      throw error;
    }
  }

  async createDeadlineReminders(now: Date, windowMs: number): Promise<number> {
    const from = new Date(now.getTime() - windowMs / 2);
    const to = new Date(now.getTime() + windowMs / 2);
    const assignments = await assignmentService.listPublishedDueBetween(
      from,
      to,
      MAX_REMINDER_ASSIGNMENTS,
    );

    let created = 0;

    for (const assignment of assignments) {
      const recipients = await enrollmentService.listActiveUserIdsByCourse(
        assignment.courseId,
        MAX_REMINDER_RECIPIENTS_PER_COURSE,
      );

      const inputs = recipients.slice(0, MAX_REMINDER_NOTIFICATIONS).map((userId) => ({
        userId,
        category: 'deadlines' as const,
        type: 'assignment_due' as const,
        title: `Assignment due: ${assignment.title}`,
        body: `The assignment "${assignment.title}" is due soon. Submit your work before the deadline.`,
        link: `/app/courses/${assignment.courseId}/assignments/${assignment.id}`,
        courseId: assignment.courseId,
        entityType: 'assignment',
        entityId: assignment.id,
        dedupeKey: `assignment-due:${assignment.id}:24h`,
      }));

      created += await this.createBatch(inputs);
    }

    return created;
  }

  private async enqueueEmail(notificationId: string): Promise<void> {
    await this.queue.enqueue({
      type: 'notification_email',
      jobId: `notification-email:${notificationId}`,
      payload: { notificationId },
    });
  }
}

export const notificationService = new NotificationService(notificationRepository, jobQueue);
