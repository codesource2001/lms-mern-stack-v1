import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '@/features/analytics/pages/dashboard-page';
import type { AdminOverview, AnalyticsOverview } from '@/features/analytics/api';

const adminOverview: AdminOverview = {
  role: 'admin',
  users: {
    total: 10,
    active: 8,
    suspended: 1,
    pendingVerification: 1,
    students: 5,
    instructors: 2,
  },
  courses: { total: 4, published: 3, draft: 1, submitted: 0, archived: 0 },
  enrollments: {
    total: 20,
    active: 10,
    pendingPayment: 4,
    expired: 3,
    revoked: 3,
    activeStudents: 8,
  },
  revenueByCurrency: [{ currency: 'USD', grossCents: 12000 }],
  completionRate: 50,
  certificates: { issued: 7, active: 5, revoked: 2 },
  enrollmentTrend: [{ month: '2026-11', count: 5 }],
  topCourses: [{ courseId: 'course-1', title: 'Course One', activeEnrollments: 6 }],
};

const fetchOverview = vi.fn((): Promise<AnalyticsOverview> => Promise.resolve(adminOverview));

vi.mock('@/features/analytics/api', () => ({
  fetchAnalyticsOverview: () => fetchOverview(),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  Pie: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  it('renders a role-aware admin summary with accessible chart data', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Active enrollments')).toBeInTheDocument();
    expect(screen.getByText('Completion rate')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /enrollments by month/i })).toBeInTheDocument();
    expect(screen.getByText('Course One')).toBeInTheDocument();
  });

  it('renders a student summary when the API returns student data', async () => {
    fetchOverview.mockResolvedValueOnce({
      role: 'student',
      progress: [
        {
          courseId: 'course-1',
          title: 'Course One',
          status: 'active',
          expiresAt: null,
          completedLessons: 3,
          totalLessons: 4,
          percent: 75,
        },
      ],
      grades: {
        assignments: { graded: 2, percent: 85 },
        quizzes: { graded: 1, percent: 80 },
      },
      upcomingAssignments: [
        {
          id: 'assignment-1',
          courseId: 'course-1',
          title: 'Final task',
          dueAt: '2026-12-01T00:00:00.000Z',
        },
      ],
      certificates: 1,
    });

    renderPage();

    expect(await screen.findByText('Course progress')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /course one progress/i })).toHaveAttribute(
      'aria-valuenow',
      '75',
    );
    expect(screen.getByText('Final task')).toBeInTheDocument();
  });
});
