import { AppError } from '../../shared/errors/app-error.js';
import { auditService, noOpAudit, type AuditService } from '../audit/audit.service.js';
import { jobQueue } from '../../infrastructure/jobs/job-queue.js';
import { courseService } from '../courses/course.service.js';
import { enrollmentService } from '../enrollments/enrollment.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { announcementRepository } from './announcement.repository.js';
import type { AnnouncementRepository } from './announcement.repository.js';
import type { AnnouncementRecord } from './announcement.model.js';

const MAX_ANNOUNCEMENTS_PER_PAGE = 50;
const MAX_RECIPIENTS = 1_000;

export class AnnouncementService {
  constructor(
    private readonly repository: AnnouncementRepository,
    private readonly queue: typeof jobQueue,
    private readonly audit: AuditService = noOpAudit,
  ) {}

  async create(input: {
    courseId: string;
    actorId: string;
    isAdmin: boolean;
    title: string;
    body: string;
  }): Promise<AnnouncementRecord> {
    const course = await courseService.findById(input.courseId);

    if (course === null) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!input.isAdmin && course.instructorId !== input.actorId) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    const announcement = await this.repository.create({
      courseId: input.courseId,
      authorId: input.actorId,
      title: input.title,
      body: input.body,
      publishedAt: new Date(),
    });

    await this.audit.record({
      actorUserId: input.actorId,
      action: 'announcement.published',
      result: 'success',
      targetType: 'announcement',
      targetId: announcement.id,
      metadata: { courseId: input.courseId },
    });

    await this.queue.enqueue({
      type: 'announcement_fanout',
      jobId: `announcement-fanout:${announcement.id}`,
      payload: { announcementId: announcement.id },
    });

    return announcement;
  }

  async listForUser(
    userId: string,
    courseId: string,
    isAdmin: boolean,
    page: number,
    limit: number,
  ) {
    const permitted = await enrollmentService.hasAccess(userId, courseId, isAdmin);

    if (!permitted) {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const safeLimit = Math.min(limit, MAX_ANNOUNCEMENTS_PER_PAGE);
    const [items, total] = await Promise.all([
      this.repository.listByCourse(courseId, safeLimit, (page - 1) * safeLimit),
      this.repository.countByCourse(courseId),
    ]);

    return { items, total, page, limit: safeLimit };
  }

  async delete(id: string, actorId: string, isAdmin: boolean): Promise<void> {
    const announcement = await this.repository.findById(id);

    if (announcement === null) {
      throw new AppError('Announcement not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const course = await courseService.findById(announcement.course.toString());

    if (course === null || (!isAdmin && course.instructorId !== actorId)) {
      throw new AppError('You do not have permission to perform this action', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    await this.repository.deleteById(id);

    await this.audit.record({
      actorUserId: actorId,
      action: 'announcement.deleted',
      result: 'success',
      targetType: 'announcement',
      targetId: id,
    });
  }

  async fanout(announcementId: string): Promise<number> {
    const announcement = await this.repository.findById(announcementId);

    if (announcement === null) {
      return 0;
    }

    const courseId = announcement.course.toString();
    const recipients = await enrollmentService.listActiveUserIdsByCourse(courseId, MAX_RECIPIENTS);

    return notificationService.createBatch(
      recipients.map((userId) => ({
        userId,
        category: 'announcements' as const,
        type: 'course_announcement' as const,
        title: announcement.title,
        body: announcement.body,
        link: `/app/courses/${courseId}/announcements/${announcementId}`,
        courseId,
        entityType: 'announcement',
        entityId: announcementId,
        dedupeKey: `announcement:${announcementId}:${userId}`,
        sendEmail: false,
      })),
    );
  }
}

export const announcementService = new AnnouncementService(
  announcementRepository,
  jobQueue,
  auditService,
);
