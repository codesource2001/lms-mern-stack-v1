import { AppError } from '../../shared/errors/app-error.js';
import { hasAdminRole } from '../auth/auth.middleware.js';
import { assignmentService } from '../assignments/assignment.service.js';
import { certificateService } from '../certificates/certificate.service.js';
import { courseService } from '../courses/course.service.js';
import { enrollmentService } from '../enrollments/enrollment.service.js';
import { lessonService } from '../lessons/lesson.service.js';
import { quizService } from '../quizzes/quiz.service.js';
import { userService } from '../users/user.service.js';
import { ROLE_SLUGS } from '../rbac/rbac.catalog.js';

export interface AnalyticsDeps {
  users: {
    getAnalytics(): Promise<{
      total: number;
      active: number;
      suspended: number;
      pendingVerification: number;
    }>;
    countActiveByRoleSlug(slug: string): Promise<number>;
  };
  courses: {
    getAnalytics(instructorId?: string): Promise<{
      total: number;
      published: number;
      draft: number;
      submitted: number;
      archived: number;
    }>;
    listByIds(
      ids: readonly string[],
    ): Promise<Array<{ id: string; title: string; currency: string }>>;
    listMine(instructorId: string): Promise<Array<{ id: string; title: string; status: string }>>;
  };
  enrollments: {
    getAnalytics(): Promise<{
      total: number;
      active: number;
      pendingPayment: number;
      expired: number;
      revoked: number;
      activeStudents: number;
      activeByCourse: Array<{ courseId: string; count: number; grossCents: number }>;
      trend: Array<{ month: string; count: number }>;
    }>;
    listMine(userId: string): Promise<
      Array<{
        enrollment: { id: string; status: string; expiresAt: Date | null };
        course: { id: string; title: string } | null;
        progress: { completedLessons: number; totalLessons: number; percent: number };
      }>
    >;
  };
  lessons: {
    getLessonCounts(courseIds: readonly string[]): Promise<Map<string, number>>;
    getCompletionCounts(courseIds: readonly string[]): Promise<Map<string, number>>;
    getUserCompletionCount(userId: string, courseId: string): Promise<number>;
  };
  assignments: {
    countUngradedByCourse(courseId: string): Promise<number>;
    getGradeStatsForUser(
      userId: string,
    ): Promise<{ graded: number; score: number; maxScore: number }>;
    listPublishedDueBetween(
      from: Date,
      to: Date,
      limit: number,
    ): Promise<Array<{ id: string; courseId: string; title: string; dueAt: Date | null }>>;
  };
  quizzes: {
    countPendingManualByCourse(courseId: string): Promise<number>;
    getGradeStatsForUser(
      userId: string,
    ): Promise<{ graded: number; score: number; maxScore: number }>;
  };
  certificates: {
    getAnalytics(): Promise<{ issued: number; active: number; revoked: number }>;
    countActiveForUser(userId: string): Promise<number>;
  };
}

function percent(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.min(100, Math.round((numerator / denominator) * 100));
}

export class AnalyticsService {
  constructor(private readonly deps: AnalyticsDeps) {}

  async getOverview(input: { userId: string; roles: readonly string[]; now?: Date }) {
    if (hasAdminRole({ roles: [...input.roles] })) {
      return this.adminOverview();
    }

    if (input.roles.includes(ROLE_SLUGS.INSTRUCTOR)) {
      return this.instructorOverview(input.userId);
    }

    if (input.roles.includes(ROLE_SLUGS.STUDENT)) {
      return this.studentOverview(input.userId, input.now ?? new Date());
    }

    throw new AppError('You do not have permission to perform this action', {
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  }

  private async adminOverview() {
    const [users, students, instructors, courses, enrollments, certificates] = await Promise.all([
      this.deps.users.getAnalytics(),
      this.deps.users.countActiveByRoleSlug(ROLE_SLUGS.STUDENT),
      this.deps.users.countActiveByRoleSlug(ROLE_SLUGS.INSTRUCTOR),
      this.deps.courses.getAnalytics(),
      this.deps.enrollments.getAnalytics(),
      this.deps.certificates.getAnalytics(),
    ]);

    const courseDetails = await this.deps.courses.listByIds(
      enrollments.activeByCourse.map((row) => row.courseId),
    );
    const courseById = new Map(courseDetails.map((course) => [course.id, course]));

    const revenueByCurrency = new Map<string, number>();
    for (const row of enrollments.activeByCourse) {
      const currency = courseById.get(row.courseId)?.currency ?? 'USD';
      revenueByCurrency.set(currency, (revenueByCurrency.get(currency) ?? 0) + row.grossCents);
    }

    const topCourses = enrollments.activeByCourse.slice(0, 5).map((row) => ({
      courseId: row.courseId,
      title: courseById.get(row.courseId)?.title ?? 'Unknown course',
      activeEnrollments: row.count,
    }));

    return {
      role: 'admin' as const,
      users: { ...users, students, instructors },
      courses,
      enrollments: {
        total: enrollments.total,
        active: enrollments.active,
        pendingPayment: enrollments.pendingPayment,
        expired: enrollments.expired,
        revoked: enrollments.revoked,
        activeStudents: enrollments.activeStudents,
      },
      revenueByCurrency: [...revenueByCurrency].map(([currency, grossCents]) => ({
        currency,
        grossCents,
      })),
      completionRate: percent(certificates.active, enrollments.active),
      certificates,
      enrollmentTrend: enrollments.trend,
      topCourses,
    };
  }

  private async instructorOverview(instructorId: string) {
    const [courses, enrollmentAnalytics] = await Promise.all([
      this.deps.courses.listMine(instructorId),
      this.deps.enrollments.getAnalytics(),
    ]);

    const courseIds = courses.map((course) => course.id);
    const [lessonCounts, completionCounts] = await Promise.all([
      this.deps.lessons.getLessonCounts(courseIds),
      this.deps.lessons.getCompletionCounts(courseIds),
    ]);

    const enrollmentByCourse = new Map(
      enrollmentAnalytics.activeByCourse.map((row) => [row.courseId, row.count]),
    );

    const performance = await Promise.all(
      courses.map(async (course) => {
        const activeEnrollments = enrollmentByCourse.get(course.id) ?? 0;
        const lessonCount = lessonCounts.get(course.id) ?? 0;
        const completions = completionCounts.get(course.id) ?? 0;
        const ungradedSubmissions = await this.deps.assignments.countUngradedByCourse(course.id);
        const pendingManualQuizzes = await this.deps.quizzes.countPendingManualByCourse(course.id);

        return {
          courseId: course.id,
          title: course.title,
          status: course.status,
          activeEnrollments,
          lessonCount,
          averageProgressPercent: percent(completions, lessonCount * activeEnrollments),
          ungradedSubmissions,
          pendingManualQuizzes,
        };
      }),
    );

    const totals = performance.reduce(
      (accumulator, row) => ({
        activeEnrollments: accumulator.activeEnrollments + row.activeEnrollments,
        ungradedSubmissions: accumulator.ungradedSubmissions + row.ungradedSubmissions,
        pendingManualQuizzes: accumulator.pendingManualQuizzes + row.pendingManualQuizzes,
      }),
      { activeEnrollments: 0, ungradedSubmissions: 0, pendingManualQuizzes: 0 },
    );

    return {
      role: 'instructor' as const,
      performance,
      totals,
      courseCount: courses.length,
    };
  }

  private async studentOverview(userId: string, now: Date) {
    const enrollments = await this.deps.enrollments.listMine(userId);
    const courseIds = enrollments
      .map((item) => item.course?.id)
      .filter((id): id is string => id !== undefined);

    const [assignmentGrades, quizGrades, certificates, dueSoon] = await Promise.all([
      this.deps.assignments.getGradeStatsForUser(userId),
      this.deps.quizzes.getGradeStatsForUser(userId),
      this.deps.certificates.countActiveForUser(userId),
      this.deps.assignments.listPublishedDueBetween(
        now,
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        20,
      ),
    ]);

    const enrolledCourseIds = new Set(courseIds);
    const upcoming = dueSoon
      .filter((assignment) => enrolledCourseIds.has(assignment.courseId))
      .slice(0, 10)
      .map((assignment) => ({
        id: assignment.id,
        courseId: assignment.courseId,
        title: assignment.title,
        dueAt: assignment.dueAt,
      }));

    const progress = enrollments.map((item) => ({
      courseId: item.course?.id ?? '',
      title: item.course?.title ?? 'Unknown course',
      status: item.enrollment.status,
      expiresAt: item.enrollment.expiresAt,
      completedLessons: item.progress.completedLessons,
      totalLessons: item.progress.totalLessons,
      percent: item.progress.percent,
    }));

    return {
      role: 'student' as const,
      progress,
      grades: {
        assignments: {
          graded: assignmentGrades.graded,
          percent: percent(assignmentGrades.score, assignmentGrades.maxScore),
        },
        quizzes: {
          graded: quizGrades.graded,
          percent: percent(quizGrades.score, quizGrades.maxScore),
        },
      },
      upcomingAssignments: upcoming,
      certificates,
    };
  }
}

const analyticsDependencies: AnalyticsDeps = {
  users: {
    getAnalytics: () => userService.getAnalytics(),
    countActiveByRoleSlug: (slug) => userService.countActiveByRoleSlug(slug),
  },
  courses: {
    getAnalytics: (instructorId) => courseService.getAnalytics(instructorId),
    listByIds: (ids) => courseService.listByIds(ids),
    listMine: (instructorId) => courseService.listMine(instructorId),
  },
  enrollments: {
    getAnalytics: () => enrollmentService.getAnalytics(),
    listMine: (userId) => enrollmentService.listMine(userId),
  },
  lessons: {
    getLessonCounts: (ids) => lessonService.getLessonCounts(ids),
    getCompletionCounts: (ids) => lessonService.getCompletionCounts(ids),
    getUserCompletionCount: (userId, courseId) =>
      lessonService.getUserCompletionCount(userId, courseId),
  },
  assignments: {
    countUngradedByCourse: (courseId) => assignmentService.countUngradedByCourse(courseId),
    getGradeStatsForUser: (userId) => assignmentService.getGradeStatsForUser(userId),
    listPublishedDueBetween: (from, to, limit) =>
      assignmentService.listPublishedDueBetween(from, to, limit),
  },
  quizzes: {
    countPendingManualByCourse: (courseId) => quizService.countPendingManualByCourse(courseId),
    getGradeStatsForUser: (userId) => quizService.getGradeStatsForUser(userId),
  },
  certificates: {
    getAnalytics: () => certificateService.getAnalytics(),
    countActiveForUser: (userId) => certificateService.countActiveForUser(userId),
  },
};

export const analyticsService = new AnalyticsService(analyticsDependencies);
