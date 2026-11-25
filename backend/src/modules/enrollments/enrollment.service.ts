import { AppError } from '../../shared/errors/app-error.js';
import { auditService, noOpAudit, type AuditService } from '../audit/audit.service.js';
import { CourseRepository } from '../courses/course.repository.js';
import { toCourseRecord } from '../courses/course.model.js';
import { LessonRepository } from '../lessons/lesson.repository.js';
import { EnrollmentRepository } from './enrollment.repository.js';
import { toEnrollmentRecord } from './enrollment.model.js';

export class EnrollmentService {
  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly courses: CourseRepository,
    private readonly lessons: LessonRepository,
    private readonly audit: AuditService = noOpAudit,
  ) {}

  async enroll(userId: string, courseId: string) {
    const course = await this.courses.findById(courseId);

    if (course === null || course.status !== 'published') {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const existing = await this.enrollments.findByUserAndCourse(userId, courseId);

    if (existing !== null) {
      throw new AppError('You are already enrolled in this course', {
        statusCode: 409,
        code: 'ALREADY_ENROLLED',
      });
    }

    const isFree = course.priceCents === 0;
    const status = isFree ? 'active' : 'pending_payment';
    const expiresAt = isFree ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;

    let document;

    try {
      document = await this.enrollments.create({
        userId,
        courseId,
        pricePaidCents: 0,
        expiresAt,
        status,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError('You are already enrolled in this course', {
          statusCode: 409,
          code: 'ALREADY_ENROLLED',
        });
      }

      throw error;
    }

    return toEnrollmentRecord(document);
  }

  async hasAccess(userId: string, courseId: string, isAdmin: boolean) {
    if (isAdmin) {
      return true;
    }

    const course = await this.courses.findById(courseId);

    if (course === null) {
      return false;
    }

    if (course.instructor.toString() === userId) {
      return true;
    }

    const enrollment = await this.enrollments.findByUserAndCourse(userId, courseId);

    if (enrollment === null) {
      return false;
    }

    const status = await this.enrollments.expireIfNeeded(
      { id: enrollment._id.toString(), expiresAt: enrollment.expiresAt, status: enrollment.status },
      new Date(),
    );

    return status === 'active';
  }

  async listMine(userId: string) {
    const enrollments = await this.enrollments.listByUser(userId);
    const now = new Date();

    return Promise.all(
      enrollments.map(async (enrollment) => {
        const status = await this.enrollments.expireIfNeeded(
          {
            id: enrollment._id.toString(),
            expiresAt: enrollment.expiresAt,
            status: enrollment.status,
          },
          now,
        );
        const course = await this.courses.findById(enrollment.course.toString());
        const lessons = await this.lessons.listByCourse(enrollment.course.toString());
        const completed = await Promise.all(
          lessons.map((lesson) => this.lessons.isComplete(userId, lesson._id.toString())),
        );
        const completedCount = completed.filter(Boolean).length;

        return {
          enrollment: toEnrollmentRecord({ ...enrollment, status } as never),
          course: course === null ? null : toCourseRecord(course),
          progress: {
            completedLessons: completedCount,
            totalLessons: lessons.length,
            percent: lessons.length === 0 ? 0 : Math.round((completedCount / lessons.length) * 100),
          },
        };
      }),
    );
  }

  async getAnalytics() {
    return this.enrollments.analyticsSummary();
  }

  async listActiveUserIdsByCourse(courseId: string, limit = 1_000): Promise<string[]> {
    return this.enrollments.listActiveUserIdsByCourse(courseId, limit);
  }

  async revoke(id: string, actorId: string) {
    const enrollment = await this.enrollments.findById(id);

    if (enrollment === null) {
      throw new AppError('Enrollment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const updated = await this.enrollments.revokeById(id, new Date());

    if (updated === null) {
      throw new AppError('Enrollment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    await this.audit.record({
      actorUserId: actorId,
      action: 'enrollment.revoked',
      result: 'success',
      targetType: 'enrollment',
      targetId: id,
    });

    return toEnrollmentRecord(updated);
  }

  async activate(id: string, actorId: string) {
    const enrollment = await this.enrollments.findById(id);

    if (enrollment === null) {
      throw new AppError('Enrollment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const updated = await this.enrollments.activateById(id);

    if (updated === null) {
      throw new AppError('Enrollment not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    await this.audit.record({
      actorUserId: actorId,
      action: 'enrollment.activated',
      result: 'success',
      targetType: 'enrollment',
      targetId: id,
    });

    return toEnrollmentRecord(updated);
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

export const enrollmentRepository = new EnrollmentRepository();
export const courseRepositoryForEnrollments = new CourseRepository();
export const lessonRepositoryForEnrollments = new LessonRepository();
export const enrollmentService = new EnrollmentService(
  enrollmentRepository,
  courseRepositoryForEnrollments,
  lessonRepositoryForEnrollments,
  auditService,
);
