import { randomBytes } from 'node:crypto';

import { AppError } from '../../shared/errors/app-error.js';
import { auditService, type AuditService } from '../audit/audit.service.js';
import { CourseRepository } from '../courses/course.repository.js';
import { userService } from '../users/user.service.js';
import { EnrollmentRepository } from '../enrollments/enrollment.repository.js';
import { LessonRepository } from '../lessons/lesson.repository.js';
import { CertificateRepository } from './certificate.repository.js';
import { toCertificateRecord, type CertificateRecord } from './certificate.model.js';

interface UserLookup {
  findById(id: string): Promise<{ name: string } | null>;
}

interface IssueResult {
  certificate: CertificateRecord;
  created: boolean;
}

export class CertificateService {
  constructor(
    private readonly certificates: CertificateRepository,
    private readonly courses: CourseRepository,
    private readonly lessons: LessonRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly users: UserLookup,
    private readonly audit: AuditService,
  ) {}

  async issue(input: {
    userId: string;
    courseId: string;
    actorUserId: string;
  }): Promise<IssueResult> {
    const existing = await this.certificates.findActive(input.userId, input.courseId);

    if (existing !== null) {
      return { certificate: toCertificateRecord(existing), created: false };
    }

    const course = await this.courses.findById(input.courseId);

    if (course === null || course.status !== 'published') {
      throw new AppError('Course not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const enrollment = await this.enrollments.findByUserAndCourse(input.userId, input.courseId);

    if (enrollment === null) {
      throw new AppError('Enrollment is required', { statusCode: 403, code: 'FORBIDDEN' });
    }

    const status = await this.enrollments.expireIfNeeded(
      { id: enrollment._id.toString(), expiresAt: enrollment.expiresAt, status: enrollment.status },
      new Date(),
    );

    if (status !== 'active') {
      throw new AppError('Active enrollment is required', { statusCode: 403, code: 'FORBIDDEN' });
    }

    const lessons = await this.lessons.listByCourse(input.courseId);
    const completed = await Promise.all(
      lessons.map((lesson) => this.lessons.isComplete(input.userId, lesson._id.toString())),
    );

    if (!completed.every(Boolean)) {
      throw new AppError('Course is not complete', {
        statusCode: 409,
        code: 'COURSE_NOT_COMPLETE',
      });
    }

    const user = await this.users.findById(input.userId);

    if (user === null) {
      throw new AppError('User not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const certificateId = `CRT-${randomBytes(18).toString('base64url')}`;
      const created = await this.certificates.create({
        certificateId,
        userId: input.userId,
        courseId: input.courseId,
        recipientName: user.name,
        courseTitle: course.title,
      });

      if (created !== null) {
        const certificate = toCertificateRecord(created);

        await this.audit.record({
          actorUserId: input.actorUserId,
          action: 'certificate.issued',
          result: 'success',
          targetType: 'certificate',
          targetId: certificate.certificateId,
          metadata: { courseId: input.courseId, userId: input.userId },
        });

        return { certificate, created: true };
      }

      // A concurrent request may have won the active-certificate index.
      const winner = await this.certificates.findActive(input.userId, input.courseId);

      if (winner !== null) {
        return { certificate: toCertificateRecord(winner), created: false };
      }
    }

    throw new AppError('Certificate could not be issued. Please retry.', {
      statusCode: 409,
      code: 'ISSUANCE_CONFLICT',
    });
  }

  async listMine(userId: string) {
    const certificates = await this.certificates.listByUser(userId);
    return certificates.map(toCertificateRecord);
  }

  /**
   * Public verification returns only what is needed to confirm the credential:
   * no email, user id, or internal identifiers.
   */
  async verify(certificateId: string) {
    const certificate = await this.certificates.findByCertificateId(certificateId);

    if (certificate === null) {
      throw new AppError('Certificate not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return {
      certificateId: certificate.certificateId,
      status: certificate.active ? ('valid' as const) : ('revoked' as const),
      recipientName: certificate.recipientName,
      courseTitle: certificate.courseTitle,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
    };
  }

  async getForDownload(input: { certificateId: string; actorId: string; isAdmin: boolean }) {
    const certificate = await this.certificates.findByCertificateId(input.certificateId);

    if (
      certificate === null ||
      !certificate.active ||
      (!input.isAdmin && certificate.user.toString() !== input.actorId)
    ) {
      throw new AppError('Certificate not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    return toCertificateRecord(certificate);
  }

  async revoke(input: { certificateId: string; actorId: string; reason: string }) {
    const certificate = await this.certificates.findByCertificateId(input.certificateId);

    if (certificate === null) {
      throw new AppError('Certificate not found', { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (!certificate.active) {
      throw new AppError('Certificate is already revoked', {
        statusCode: 409,
        code: 'ALREADY_REVOKED',
      });
    }

    const updated = await this.certificates.revoke({
      certificateId: input.certificateId,
      actorId: input.actorId,
      reason: input.reason,
      now: new Date(),
    });

    if (updated === null) {
      throw new AppError('Certificate is already revoked', {
        statusCode: 409,
        code: 'ALREADY_REVOKED',
      });
    }

    await this.audit.record({
      actorUserId: input.actorId,
      action: 'certificate.revoked',
      result: 'success',
      targetType: 'certificate',
      targetId: input.certificateId,
      metadata: { reason: input.reason },
    });

    return toCertificateRecord(updated);
  }
}

export const certificateRepository = new CertificateRepository();
export const courseRepositoryForCertificates = new CourseRepository();
export const lessonRepositoryForCertificates = new LessonRepository();
export const enrollmentRepositoryForCertificates = new EnrollmentRepository();
export const certificateService = new CertificateService(
  certificateRepository,
  courseRepositoryForCertificates,
  lessonRepositoryForCertificates,
  enrollmentRepositoryForCertificates,
  userService,
  auditService,
);
