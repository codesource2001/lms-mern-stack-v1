/* eslint-disable */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emailService } from '../src/infrastructure/email/email.service.js';
import { assignmentService } from '../src/modules/assignments/assignment.service.js';
import { enrollmentService } from '../src/modules/enrollments/enrollment.service.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { userService } from '../src/modules/users/user.service.js';

const DEFAULT_PREFERENCES = {
  announcements: { inApp: true, email: false },
  deadlines: { inApp: true, email: true },
  grades: { inApp: true, email: true },
  system: { inApp: true, email: false },
};

function makeRepository(overrides: Record<string, unknown> = {}) {
  const notifications = new Map<string, any>();
  let nextId = 1;

  const repository = {
    getPreferences: vi.fn(async () => ({ ...DEFAULT_PREFERENCES })),
    create: vi.fn(async (input: any) => {
      const duplicate = [...notifications.values()].some(
        (item) =>
          item.userId === input.userId &&
          item.dedupeKey !== null &&
          item.dedupeKey === input.dedupeKey,
      );

      if (duplicate) {
        return null;
      }

      const id = `notification-${nextId++}`;
      const record = {
        id,
        userId: input.userId,
        user: { toString: () => input.userId },
        category: input.category,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        courseId: input.courseId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        readAt: null,
        emailStatus: input.emailStatus,
        emailAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      notifications.set(id, record);
      return record;
    }),
    listByUser: vi.fn(async () => []),
    countByUser: vi.fn(async () => 0),
    findById: vi.fn(async (id: string) => notifications.get(id) ?? null),
    markRead: vi.fn(async () => null),
    markAllRead: vi.fn(async () => 3),
    upsertPreferences: vi.fn(async () => DEFAULT_PREFERENCES),
    setEmailDelivery: vi.fn(async () => {}),
    ...overrides,
  };

  return repository;
}

function makeQueue() {
  return { enqueue: vi.fn(async () => ({ id: 'job-1', created: true })) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NotificationService', () => {
  it('skips notifications when the category is disabled in-app', async () => {
    const repository = makeRepository();
    repository.getPreferences.mockResolvedValue({
      ...DEFAULT_PREFERENCES,
      announcements: { inApp: false, email: true },
    });
    const queue = makeQueue();
    const service = new NotificationService(repository as never, queue as never);

    const result = await service.create({
      userId: 'user-1',
      category: 'announcements',
      type: 'course_announcement',
      title: 'Announcement',
      body: 'New material is available',
    });

    expect(result).toBeNull();
    expect(repository.create).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues an email job when the channel allows email', async () => {
    const repository = makeRepository();
    const queue = makeQueue();
    const service = new NotificationService(repository as never, queue as never);

    const result = await service.create({
      userId: 'user-1',
      category: 'deadlines',
      type: 'assignment_due',
      title: 'Assignment due',
      body: 'Submit soon',
      dedupeKey: 'assignment-due:assignment-1:user-1',
    });

    expect(result).toMatchObject({ emailStatus: 'pending' });
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notification_email',
        jobId: `notification-email:${result!.id}`,
      }),
    );
  });

  it('does not request email when the recipient opted out', async () => {
    const repository = makeRepository();
    repository.getPreferences.mockResolvedValue({
      ...DEFAULT_PREFERENCES,
      deadlines: { inApp: true, email: false },
    });
    const queue = makeQueue();
    const service = new NotificationService(repository as never, queue as never);

    const result = await service.create({
      userId: 'user-1',
      category: 'deadlines',
      type: 'assignment_due',
      title: 'Assignment due',
      body: 'Submit soon',
    });

    expect(result).toMatchObject({ emailStatus: 'not_requested' });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('returns 404 when marking a notification owned by another user', async () => {
    const service = new NotificationService(makeRepository() as never, makeQueue() as never);

    await expect(service.markRead('notification-1', 'intruder')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('marks all notifications as read for the owner', async () => {
    const repository = makeRepository();
    const service = new NotificationService(repository as never, makeQueue() as never);

    await expect(service.markAllRead('user-1')).resolves.toBe(3);
    expect(repository.markAllRead).toHaveBeenCalledWith('user-1', expect.any(Date));
  });

  it('updates only the supplied preference channels', async () => {
    const repository = makeRepository();
    const service = new NotificationService(repository as never, makeQueue() as never);

    await service.updatePreferences('user-1', { grades: { email: false } });

    expect(repository.upsertPreferences).toHaveBeenCalledWith('user-1', {
      grades: { email: false },
    });
  });

  it('delivers email and records the sent status', async () => {
    const repository = makeRepository();
    const send = vi.spyOn(emailService, 'send').mockResolvedValue();
    vi.spyOn(userService, 'findById').mockResolvedValue({
      id: 'user-1',
      name: 'Ada',
      email: 'ada@example.com',
    } as never);
    const service = new NotificationService(repository as never, makeQueue() as never);
    await repository.create({
      userId: 'user-1',
      category: 'deadlines',
      type: 'assignment_due',
      title: 'Assignment due',
      body: 'Submit soon',
      emailStatus: 'pending',
    });

    await service.deliverEmail('notification-1');

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }));
    expect(repository.setEmailDelivery).toHaveBeenCalledWith(
      'notification-1',
      expect.objectContaining({ status: 'sent' }),
    );
  });

  it('records a failed delivery and rethrows so the job can retry', async () => {
    const repository = makeRepository();
    vi.spyOn(emailService, 'send').mockRejectedValue(new Error('SMTP offline'));
    vi.spyOn(userService, 'findById').mockResolvedValue({
      id: 'user-1',
      name: 'Ada',
      email: 'ada@example.com',
    } as never);
    const service = new NotificationService(repository as never, makeQueue() as never);
    await repository.create({
      userId: 'user-1',
      category: 'deadlines',
      type: 'assignment_due',
      title: 'Assignment due',
      body: 'Submit soon',
      emailStatus: 'pending',
    });

    await expect(service.deliverEmail('notification-1')).rejects.toThrow('SMTP offline');
    expect(repository.setEmailDelivery).toHaveBeenCalledWith(
      'notification-1',
      expect.objectContaining({ status: 'failed', attempts: 1 }),
    );
  });

  it('creates one deadline reminder per learner and deduplicates repeat runs', async () => {
    const repository = makeRepository();
    const queue = makeQueue();
    const service = new NotificationService(repository as never, queue as never);
    vi.spyOn(assignmentService, 'listPublishedDueBetween').mockResolvedValue([
      {
        id: 'assignment-1',
        courseId: 'course-1',
        title: 'Final task',
        dueAt: new Date('2026-11-25T12:00:00.000Z'),
      },
    ] as never);
    vi.spyOn(enrollmentService, 'listActiveUserIdsByCourse').mockResolvedValue([
      'user-1',
      'user-2',
    ]);

    const first = await service.createDeadlineReminders(new Date(), 86_400_000);
    const second = await service.createDeadlineReminders(new Date(), 86_400_000);

    expect(first).toBe(2);
    expect(second).toBe(0);
    expect(repository.create).toHaveBeenCalledTimes(4);
  });
});
