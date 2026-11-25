/* eslint-disable */
import { describe, expect, it, vi } from 'vitest';

import { CertificateService } from '../src/modules/certificates/certificate.service.js';

const COURSE_ID = 'course-1';
const USER_ID = 'user-1';

function makeFixture() {
  const certificates = new Map<string, any>();
  let nextId = 1;
  let duplicateNextCreate = false;
  let createCalls = 0;

  const certificateRepository = {
    async findActive(userId: string, courseId: string) {
      return (
        [...certificates.values()].find(
          (certificate) =>
            certificate.active &&
            certificate.user.toString() === userId &&
            certificate.course.toString() === courseId,
        ) ?? null
      );
    },
    async findByCertificateId(certificateId: string) {
      return certificates.get(certificateId) ?? null;
    },
    async listByUser(userId: string) {
      return [...certificates.values()].filter(
        (certificate) => certificate.user.toString() === userId,
      );
    },
    async create(input: any) {
      createCalls += 1;

      if (duplicateNextCreate) {
        duplicateNextCreate = false;

        const winner = {
          _id: { toString: () => 'db-winner' },
          certificateId: 'CRT-concurrent-winner',
          user: { toString: () => input.userId },
          course: { toString: () => input.courseId },
          recipientName: input.recipientName,
          courseTitle: input.courseTitle,
          issuedAt: new Date(),
          active: true,
          revokedAt: null,
          revokedReason: null,
          revokedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        certificates.set(winner.certificateId, winner);
        return null;
      }

      const document = {
        _id: { toString: () => `db-${nextId++}` },
        certificateId: input.certificateId,
        user: { toString: () => input.userId },
        course: { toString: () => input.courseId },
        recipientName: input.recipientName,
        courseTitle: input.courseTitle,
        issuedAt: new Date(),
        active: true,
        revokedAt: null,
        revokedReason: null,
        revokedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      certificates.set(document.certificateId, document);
      return document;
    },
    async revoke(input: any) {
      const certificate = certificates.get(input.certificateId);

      if (certificate === undefined || !certificate.active) {
        return null;
      }

      certificate.active = false;
      certificate.revokedAt = input.now;
      certificate.revokedReason = input.reason;
      certificate.revokedBy = { toString: () => input.actorId };

      return certificate;
    },
  };

  const course = {
    id: COURSE_ID,
    title: 'Testing Fundamentals',
    status: 'published',
  };

  const courseRepository = {
    async findById(id: string) {
      return id === COURSE_ID ? course : null;
    },
  };

  const lessons = [{ _id: { toString: () => 'lesson-1' } }];
  let lessonComplete = true;

  const lessonRepository = {
    async listByCourse() {
      return lessons;
    },
    async isComplete() {
      return lessonComplete;
    },
  };

  let enrollment: any = {
    _id: { toString: () => 'enrollment-1' },
    status: 'active',
    expiresAt: null,
  };

  const enrollmentRepository = {
    async findByUserAndCourse() {
      return enrollment;
    },
    async expireIfNeeded(current: any) {
      return current.status;
    },
  };

  const userRepository = {
    async findById(id: string) {
      return id === USER_ID ? { name: 'Ada Learner' } : null;
    },
  };

  const audit = { record: vi.fn(async () => undefined) };

  const service = new CertificateService(
    certificateRepository as any,
    courseRepository as any,
    lessonRepository as any,
    enrollmentRepository as any,
    userRepository as any,
    audit as any,
  );

  return {
    service,
    certificates,
    audit,
    setLessonComplete(value: boolean) {
      lessonComplete = value;
    },
    setEnrollment(value: any) {
      enrollment = value;
    },
    duplicateNextCreate() {
      duplicateNextCreate = true;
    },
    get createCalls() {
      return createCalls;
    },
  };
}

describe('CertificateService', () => {
  it('issues a non-guessable certificate when every lesson is complete', async () => {
    const fixture = makeFixture();

    const result = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    expect(result.created).toBe(true);
    expect(result.certificate.certificateId).toMatch(/^CRT-[A-Za-z0-9_-]{24}$/);
    expect(result.certificate.recipientName).toBe('Ada Learner');
    expect(result.certificate.courseTitle).toBe('Testing Fundamentals');
    expect(result.certificate.active).toBe(true);
    expect(fixture.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'certificate.issued',
        targetId: result.certificate.certificateId,
      }),
    );
  });

  it('returns the existing active certificate on repeat issuance', async () => {
    const fixture = makeFixture();

    const first = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });
    const second = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    expect(second.created).toBe(false);
    expect(second.certificate.certificateId).toBe(first.certificate.certificateId);
    expect(fixture.createCalls).toBe(1);
  });

  it('returns the concurrent winner when the unique index rejects a create', async () => {
    const fixture = makeFixture();
    fixture.duplicateNextCreate();

    const result = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    expect(result.created).toBe(false);
    expect(result.certificate.certificateId).toBe('CRT-concurrent-winner');
  });

  it('rejects issuance when a lesson is incomplete', async () => {
    const fixture = makeFixture();
    fixture.setLessonComplete(false);

    await expect(
      fixture.service.issue({ userId: USER_ID, courseId: COURSE_ID, actorUserId: USER_ID }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'COURSE_NOT_COMPLETE' });
  });

  it('rejects issuance without an active enrollment', async () => {
    const fixture = makeFixture();
    fixture.setEnrollment({
      _id: { toString: () => 'enrollment-1' },
      status: 'expired',
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(
      fixture.service.issue({ userId: USER_ID, courseId: COURSE_ID, actorUserId: USER_ID }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('publishes only verification-relevant fields', async () => {
    const fixture = makeFixture();
    const issued = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    const verification = await fixture.service.verify(issued.certificate.certificateId);

    expect(verification).toEqual({
      certificateId: issued.certificate.certificateId,
      status: 'valid',
      recipientName: 'Ada Learner',
      courseTitle: 'Testing Fundamentals',
      issuedAt: expect.any(Date),
      revokedAt: null,
    });
    expect(verification).not.toHaveProperty('userId');
    expect(verification).not.toHaveProperty('email');
  });

  it('revokes once with an audit trail and reports the revoked public status', async () => {
    const fixture = makeFixture();
    const issued = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    const revoked = await fixture.service.revoke({
      certificateId: issued.certificate.certificateId,
      actorId: 'admin-1',
      reason: 'Academic integrity violation',
    });

    expect(revoked.active).toBe(false);
    expect(revoked.revokedReason).toBe('Academic integrity violation');
    expect(revoked.revokedById).toBe('admin-1');

    await expect(
      fixture.service.revoke({
        certificateId: issued.certificate.certificateId,
        actorId: 'admin-1',
        reason: 'Duplicate attempt',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_REVOKED' });

    const verification = await fixture.service.verify(issued.certificate.certificateId);
    expect(verification.status).toBe('revoked');
    expect(verification.revokedAt).toEqual(expect.any(Date));

    expect(fixture.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'certificate.revoked',
        actorUserId: 'admin-1',
        targetId: issued.certificate.certificateId,
      }),
    );
  });

  it('allows downloads only for the owner or an administrator', async () => {
    const fixture = makeFixture();
    const issued = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    await expect(
      fixture.service.getForDownload({
        certificateId: issued.certificate.certificateId,
        actorId: 'other-student',
        isAdmin: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    const owner = await fixture.service.getForDownload({
      certificateId: issued.certificate.certificateId,
      actorId: USER_ID,
      isAdmin: false,
    });
    expect(owner.certificateId).toBe(issued.certificate.certificateId);

    const admin = await fixture.service.getForDownload({
      certificateId: issued.certificate.certificateId,
      actorId: 'admin-1',
      isAdmin: true,
    });
    expect(admin.certificateId).toBe(issued.certificate.certificateId);
  });

  it('reissues a new active certificate after revocation', async () => {
    const fixture = makeFixture();
    const first = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    await fixture.service.revoke({
      certificateId: first.certificate.certificateId,
      actorId: 'admin-1',
      reason: 'Reissue requested after correction',
    });

    const second = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    expect(second.created).toBe(true);
    expect(second.certificate.active).toBe(true);
    expect(second.certificate.certificateId).not.toBe(first.certificate.certificateId);
    expect(fixture.certificates.size).toBe(2);
  });

  it('does not serve revoked certificates for download', async () => {
    const fixture = makeFixture();
    const issued = await fixture.service.issue({
      userId: USER_ID,
      courseId: COURSE_ID,
      actorUserId: USER_ID,
    });

    await fixture.service.revoke({
      certificateId: issued.certificate.certificateId,
      actorId: 'admin-1',
      reason: 'Course completion was reversed',
    });

    await expect(
      fixture.service.getForDownload({
        certificateId: issued.certificate.certificateId,
        actorId: USER_ID,
        isAdmin: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
