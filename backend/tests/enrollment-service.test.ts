/* eslint-disable */
import { describe, expect, it } from 'vitest';

import { EnrollmentService } from '../src/modules/enrollments/enrollment.service.js';

const USER_ID = 'student-1';
const COURSE_ID = 'course-1';
const INSTRUCTOR_ID = 'instructor-1';

function makeFixture(options: { priceCents?: number; enrollmentStatus?: string } = {}) {
  const priceCents = options.priceCents ?? 0;
  let enrollment: any = null;

  const course = {
    _id: { toString: () => COURSE_ID },
    title: 'Course One',
    slug: 'course-one',
    description: 'A course',
    shortDescription: null,
    instructor: { toString: () => INSTRUCTOR_ID },
    category: null,
    tags: [],
    prerequisites: [],
    thumbnailKey: null,
    bannerKey: null,
    priceCents,
    currency: 'USD',
    status: 'published',
    submittedAt: null,
    publishedAt: new Date(),
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const courses = {
    async findById(id: string) {
      return id === COURSE_ID ? course : null;
    },
  };

  const lessons = {
    async listByCourse() {
      return [{ _id: { toString: () => 'lesson-1' } }, { _id: { toString: () => 'lesson-2' } }];
    },
    async isComplete(_userId: string, lessonId: string) {
      return lessonId === 'lesson-1';
    },
  };

  const enrollments = {
    async findByUserAndCourse() {
      return enrollment;
    },
    async findById() {
      return enrollment;
    },
    async create(input: any) {
      if (options.enrollmentStatus === 'duplicate') {
        throw { code: 11000 };
      }

      enrollment = {
        _id: { toString: () => 'enrollment-1' },
        user: { toString: () => input.userId },
        course: { toString: () => input.courseId },
        status: input.status,
        expiresAt: input.expiresAt,
        pricePaidCents: input.pricePaidCents,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return enrollment;
    },
    async listByUser() {
      return enrollment === null ? [] : [enrollment];
    },
    async expireIfNeeded(input: any, now: Date) {
      if (
        input.status === 'active' &&
        input.expiresAt !== null &&
        input.expiresAt.getTime() <= now.getTime()
      ) {
        enrollment.status = 'expired';
        return 'expired';
      }

      return input.status;
    },
    async revokeById() {
      enrollment.status = 'revoked';
      return enrollment;
    },
    async activateById() {
      enrollment.status = 'active';
      return enrollment;
    },
  };

  return {
    service: new EnrollmentService(enrollments as never, courses as never, lessons as never),
    enrollments,
    courses,
    lessons,
    getEnrollment: () => enrollment,
  };
}

describe('EnrollmentService', () => {
  it('activates a free course enrollment and denies duplicates under concurrency', async () => {
    const fixture = makeFixture();

    const first = await fixture.service.enroll(USER_ID, COURSE_ID);
    expect(first.status).toBe('active');

    const duplicate = makeFixture({ enrollmentStatus: 'duplicate' });
    await expect(duplicate.service.enroll(USER_ID, COURSE_ID)).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_ENROLLED',
    });
  });

  it('marks a paid course enrollment as pending payment', async () => {
    const fixture = makeFixture({ priceCents: 5_000 });
    const enrollment = await fixture.service.enroll(USER_ID, COURSE_ID);
    expect(enrollment.status).toBe('pending_payment');
  });

  it('revokes content access when an enrollment has expired', async () => {
    const fixture = makeFixture();
    await fixture.service.enroll(USER_ID, COURSE_ID);
    fixture.getEnrollment().expiresAt = new Date('2020-01-01T00:00:00.000Z');

    await expect(fixture.service.hasAccess(USER_ID, COURSE_ID, false)).resolves.toBe(false);
    expect(fixture.getEnrollment().status).toBe('expired');
  });

  it('allows the instructor and an administrator without an enrollment', async () => {
    const fixture = makeFixture();
    await expect(fixture.service.hasAccess(INSTRUCTOR_ID, COURSE_ID, false)).resolves.toBe(true);
    await expect(fixture.service.hasAccess('admin-1', COURSE_ID, true)).resolves.toBe(true);
    await expect(fixture.service.hasAccess('stranger-1', COURSE_ID, false)).resolves.toBe(false);
  });

  it('recalculates progress from lesson completion records', async () => {
    const fixture = makeFixture();
    await fixture.service.enroll(USER_ID, COURSE_ID);

    const result = await fixture.service.listMine(USER_ID);

    expect(result).toEqual([
      expect.objectContaining({
        course: expect.objectContaining({ id: COURSE_ID }),
        progress: { completedLessons: 1, totalLessons: 2, percent: 50 },
      }),
    ]);
  });
});
