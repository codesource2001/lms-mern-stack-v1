/* eslint-disable */
import { describe, expect, it, vi } from 'vitest';

import {
  AnalyticsService,
  type AnalyticsDeps,
} from '../src/modules/analytics/analytics.service.js';

function makeDeps(): AnalyticsDeps {
  return {
    users: {
      getAnalytics: vi.fn(async () => ({
        total: 10,
        active: 8,
        suspended: 1,
        pendingVerification: 1,
      })),
      countActiveByRoleSlug: vi.fn(async (slug: string) => (slug === 'student' ? 5 : 2)),
    },
    courses: {
      getAnalytics: vi.fn(async () => ({
        total: 4,
        published: 3,
        draft: 1,
        submitted: 0,
        archived: 0,
      })),
      listByIds: vi.fn(async () => [
        { id: 'course-1', title: 'Course One', currency: 'USD' },
        { id: 'course-2', title: 'Course Two', currency: 'EUR' },
      ]),
      listMine: vi.fn(async () => [{ id: 'course-1', title: 'Course One', status: 'published' }]),
    },
    enrollments: {
      getAnalytics: vi.fn(async () => ({
        total: 20,
        active: 10,
        pendingPayment: 4,
        expired: 3,
        revoked: 3,
        activeStudents: 8,
        activeByCourse: [
          { courseId: 'course-1', count: 6, grossCents: 6000 },
          { courseId: 'course-2', count: 4, grossCents: 4000 },
        ],
        trend: [{ month: '2026-11', count: 5 }],
      })),
      listMine: vi.fn(async () => [
        {
          enrollment: {
            id: 'enrollment-1',
            status: 'active',
            expiresAt: new Date('2027-01-01T00:00:00.000Z'),
          },
          course: { id: 'course-1', title: 'Course One' },
          progress: { completedLessons: 3, totalLessons: 4, percent: 75 },
        },
      ]),
    },
    lessons: {
      getLessonCounts: vi.fn(async () => new Map([['course-1', 4]])),
      getCompletionCounts: vi.fn(async () => new Map([['course-1', 12]])),
      getUserCompletionCount: vi.fn(async () => 3),
    },
    assignments: {
      countUngradedByCourse: vi.fn(async () => 2),
      getGradeStatsForUser: vi.fn(async () => ({ graded: 2, score: 170, maxScore: 200 })),
      listPublishedDueBetween: vi.fn(async () => [
        {
          id: 'assignment-1',
          courseId: 'course-1',
          title: 'Task',
          dueAt: new Date('2026-12-01T00:00:00.000Z'),
        },
        {
          id: 'assignment-2',
          courseId: 'course-9',
          title: 'Other course task',
          dueAt: new Date('2026-12-02T00:00:00.000Z'),
        },
      ]),
    },
    quizzes: {
      countPendingManualByCourse: vi.fn(async () => 1),
      getGradeStatsForUser: vi.fn(async () => ({ graded: 1, score: 8, maxScore: 10 })),
    },
    certificates: {
      getAnalytics: vi.fn(async () => ({ issued: 7, active: 5, revoked: 2 })),
      countActiveForUser: vi.fn(async () => 1),
    },
  };
}

describe('AnalyticsService', () => {
  it('returns platform-wide metrics with revenue grouped by currency', async () => {
    const service = new AnalyticsService(makeDeps());

    const result = await service.getOverview({ userId: 'admin-1', roles: ['admin'] });

    expect(result.role).toBe('admin');
    if (result.role !== 'admin') {
      throw new Error('Expected admin overview');
    }
    expect(result.users).toMatchObject({ total: 10, active: 8, students: 5, instructors: 2 });
    expect(result.revenueByCurrency).toEqual([
      { currency: 'USD', grossCents: 6000 },
      { currency: 'EUR', grossCents: 4000 },
    ]);
    expect(result.completionRate).toBe(50);
    expect(result.topCourses[0]).toMatchObject({ title: 'Course One', activeEnrollments: 6 });
    expect(result.enrollmentTrend).toEqual([{ month: '2026-11', count: 5 }]);
  });

  it('scopes instructor analytics to courses they teach', async () => {
    const service = new AnalyticsService(makeDeps());

    const result = await service.getOverview({ userId: 'instructor-1', roles: ['instructor'] });

    expect(result.role).toBe('instructor');
    if (result.role !== 'instructor') {
      throw new Error('Expected instructor overview');
    }
    expect(result.performance).toEqual([
      {
        courseId: 'course-1',
        title: 'Course One',
        status: 'published',
        activeEnrollments: 6,
        lessonCount: 4,
        averageProgressPercent: 50,
        ungradedSubmissions: 2,
        pendingManualQuizzes: 1,
      },
    ]);
    expect(result.totals).toEqual({
      activeEnrollments: 6,
      ungradedSubmissions: 2,
      pendingManualQuizzes: 1,
    });
  });

  it('returns only the student own progress, grades, and enrolled-course deadlines', async () => {
    const service = new AnalyticsService(makeDeps());
    const now = new Date('2026-11-25T00:00:00.000Z');

    const result = await service.getOverview({
      userId: 'student-1',
      roles: ['student'],
      now,
    });

    expect(result.role).toBe('student');
    if (result.role !== 'student') {
      throw new Error('Expected student overview');
    }
    expect(result.progress).toEqual([
      expect.objectContaining({ courseId: 'course-1', completedLessons: 3, percent: 75 }),
    ]);
    expect(result.grades).toEqual({
      assignments: { graded: 2, percent: 85 },
      quizzes: { graded: 1, percent: 80 },
    });
    expect(result.upcomingAssignments).toEqual([
      {
        id: 'assignment-1',
        courseId: 'course-1',
        title: 'Task',
        dueAt: new Date('2026-12-01T00:00:00.000Z'),
      },
    ]);
    expect(result.certificates).toBe(1);
  });

  it('rejects a principal without a supported role', async () => {
    const service = new AnalyticsService(makeDeps());

    await expect(service.getOverview({ userId: 'user-1', roles: ['guest'] })).rejects.toMatchObject(
      { statusCode: 403, code: 'FORBIDDEN' },
    );
  });
});
