/* eslint-disable */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnnouncementService } from '../src/modules/announcements/announcement.service.js';
import { courseService } from '../src/modules/courses/course.service.js';
import { enrollmentService } from '../src/modules/enrollments/enrollment.service.js';
import { notificationService } from '../src/modules/notifications/notification.service.js';

function makeRepository() {
  return {
    create: vi.fn(async (input: any) => ({
      id: 'announcement-1',
      courseId: input.courseId,
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      publishedAt: input.publishedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findById: vi.fn(async () => ({
      _id: { toString: () => 'announcement-1' },
      course: { toString: () => 'course-1' },
      author: { toString: () => 'instructor-1' },
      title: 'New material',
      body: 'Read chapter five',
    })),
    listByCourse: vi.fn(async () => []),
    countByCourse: vi.fn(async () => 0),
    deleteById: vi.fn(async () => {}),
  };
}

function makeQueue() {
  return { enqueue: vi.fn(async () => ({ id: 'job-1', created: true })) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AnnouncementService', () => {
  it('rejects announcement creation by a non-instructor', async () => {
    vi.spyOn(courseService, 'findById').mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: 'published',
    } as never);
    const repository = makeRepository();
    const service = new AnnouncementService(repository as never, makeQueue() as never);

    await expect(
      service.create({
        courseId: 'course-1',
        actorId: 'intruder',
        isAdmin: false,
        title: 'Announcement',
        body: 'Unauthorized',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('lets an administrator publish to a course they do not own and queues fan-out', async () => {
    vi.spyOn(courseService, 'findById').mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: 'published',
    } as never);
    const repository = makeRepository();
    const queue = makeQueue();
    const service = new AnnouncementService(repository as never, queue as never);

    const announcement = await service.create({
      courseId: 'course-1',
      actorId: 'admin-1',
      isAdmin: true,
      title: 'Platform update',
      body: 'Scheduled maintenance tonight',
    });

    expect(announcement.id).toBe('announcement-1');
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'announcement_fanout',
        jobId: 'announcement-fanout:announcement-1',
      }),
    );
  });

  it('denies the announcement list to a learner without course access', async () => {
    vi.spyOn(enrollmentService, 'hasAccess').mockResolvedValue(false);
    const service = new AnnouncementService(makeRepository() as never, makeQueue() as never);

    await expect(service.listForUser('student-1', 'course-1', false, 1, 20)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('fans out one notification per active learner with a deterministic dedupe key', async () => {
    vi.spyOn(enrollmentService, 'listActiveUserIdsByCourse').mockResolvedValue([
      'user-1',
      'user-2',
    ]);
    const createBatch = vi.spyOn(notificationService, 'createBatch').mockResolvedValue(2 as never);
    const service = new AnnouncementService(makeRepository() as never, makeQueue() as never);

    await expect(service.fanout('announcement-1')).resolves.toBe(2);
    expect(createBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'user-1',
        dedupeKey: 'announcement:announcement-1:user-1',
        sendEmail: false,
      }),
      expect.objectContaining({
        userId: 'user-2',
        dedupeKey: 'announcement:announcement-1:user-2',
        sendEmail: false,
      }),
    ]);
  });
});
