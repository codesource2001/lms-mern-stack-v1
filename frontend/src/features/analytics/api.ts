import { api } from '@/lib/api';

export interface AdminOverview {
  role: 'admin';
  users: {
    total: number;
    active: number;
    suspended: number;
    pendingVerification: number;
    students: number;
    instructors: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
    submitted: number;
    archived: number;
  };
  enrollments: {
    total: number;
    active: number;
    pendingPayment: number;
    expired: number;
    revoked: number;
    activeStudents: number;
  };
  revenueByCurrency: Array<{ currency: string; grossCents: number }>;
  completionRate: number;
  certificates: { issued: number; active: number; revoked: number };
  enrollmentTrend: Array<{ month: string; count: number }>;
  topCourses: Array<{ courseId: string; title: string; activeEnrollments: number }>;
}

export interface InstructorOverview {
  role: 'instructor';
  performance: Array<{
    courseId: string;
    title: string;
    status: string;
    activeEnrollments: number;
    lessonCount: number;
    averageProgressPercent: number;
    ungradedSubmissions: number;
    pendingManualQuizzes: number;
  }>;
  totals: {
    activeEnrollments: number;
    ungradedSubmissions: number;
    pendingManualQuizzes: number;
  };
  courseCount: number;
}

export interface StudentOverview {
  role: 'student';
  progress: Array<{
    courseId: string;
    title: string;
    status: string;
    expiresAt: string | null;
    completedLessons: number;
    totalLessons: number;
    percent: number;
  }>;
  grades: {
    assignments: { graded: number; percent: number };
    quizzes: { graded: number; percent: number };
  };
  upcomingAssignments: Array<{
    id: string;
    courseId: string;
    title: string;
    dueAt: string | null;
  }>;
  certificates: number;
}

export type AnalyticsOverview = AdminOverview | InstructorOverview | StudentOverview;

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await api.get<{ data: { overview: AnalyticsOverview } }>('/analytics/overview');
  return response.data.data.overview;
}
