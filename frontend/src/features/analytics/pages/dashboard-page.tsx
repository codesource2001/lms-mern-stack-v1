import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchAnalyticsOverview,
  type AdminOverview,
  type InstructorOverview,
  type StudentOverview,
} from '@/features/analytics/api';
import { queryKeys } from '@/lib/query-keys';

const CHART_COLORS = ['var(--brand)', 'var(--amber)', 'var(--ring)'];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <p className="font-display text-2xl font-semibold">{value}</p>
      </CardHeader>
    </Card>
  );
}

function AdminDashboard({ overview }: { overview: AdminOverview }) {
  const statusData = [
    { name: 'Active', value: overview.enrollments.active },
    { name: 'Pending payment', value: overview.enrollments.pendingPayment },
    { name: 'Expired', value: overview.enrollments.expired },
    { name: 'Revoked', value: overview.enrollments.revoked },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active users" value={overview.users.active} />
        <StatCard label="Active students" value={overview.users.students} />
        <StatCard label="Instructors" value={overview.users.instructors} />
        <StatCard label="Active enrollments" value={overview.enrollments.active} />
        <StatCard label="Completion rate" value={`${overview.completionRate}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment trend</CardTitle>
            <CardDescription>New enrollments by month, most recent last.</CardDescription>
          </CardHeader>
          <CardContent>
            <figure role="img" aria-label="Bar chart of enrollments by month">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.enrollmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--brand)" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">
                Enrollment counts by month. The same values are listed in the accompanying table.
              </figcaption>
            </figure>
            <table className="sr-only">
              <caption>Enrollments by month</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Enrollments</th>
                </tr>
              </thead>
              <tbody>
                {overview.enrollmentTrend.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment status</CardTitle>
            <CardDescription>Distribution of all enrollments.</CardDescription>
          </CardHeader>
          <CardContent>
            <figure role="img" aria-label="Pie chart of enrollment status distribution">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      isAnimationActive={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length] ?? 'var(--brand)'}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">Enrollment status breakdown.</figcaption>
            </figure>
            <ul className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {statusData.map((row) => (
                <li key={row.name}>
                  {row.name}: <span className="font-medium text-foreground">{row.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top courses</CardTitle>
          <CardDescription>Courses with the most active enrollments.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {overview.topCourses.map((course) => (
              <li key={course.courseId} className="flex items-center justify-between gap-4">
                <span>{course.title}</span>
                <Badge variant="outline">{course.activeEnrollments} active</Badge>
              </li>
            ))}
          </ul>
          {overview.revenueByCurrency.map((row) => (
            <p key={row.currency} className="mt-4 text-xs text-muted-foreground">
              Enrollment value ({row.currency}): {(row.grossCents / 100).toFixed(2)}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InstructorDashboard({ overview }: { overview: InstructorOverview }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={overview.courseCount} />
        <StatCard label="Active enrollments" value={overview.totals.activeEnrollments} />
        <StatCard label="Ungraded submissions" value={overview.totals.ungradedSubmissions} />
        <StatCard label="Pending manual grading" value={overview.totals.pendingManualQuizzes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course performance</CardTitle>
          <CardDescription>Active enrollments for each course you teach.</CardDescription>
        </CardHeader>
        <CardContent>
          <figure role="img" aria-label="Bar chart of active enrollments per course">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="title" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="activeEnrollments" fill="var(--brand)" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="sr-only">Active enrollment counts by course.</figcaption>
          </figure>
          <table className="sr-only">
            <caption>Course performance</caption>
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Active enrollments</th>
                <th scope="col">Average progress</th>
                <th scope="col">Ungraded submissions</th>
              </tr>
            </thead>
            <tbody>
              {overview.performance.map((row) => (
                <tr key={row.courseId}>
                  <td>{row.title}</td>
                  <td>{row.activeEnrollments}</td>
                  <td>{row.averageProgressPercent}%</td>
                  <td>{row.ungradedSubmissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading queue</CardTitle>
          <CardDescription>Work waiting for instructor attention.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {overview.performance.map((row) => (
              <li key={row.courseId} className="flex items-center justify-between gap-4">
                <span>{row.title}</span>
                <span className="text-muted-foreground">
                  {row.ungradedSubmissions} assignments · {row.pendingManualQuizzes} quizzes
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentDashboard({ overview }: { overview: StudentOverview }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assignment grades" value={`${overview.grades.assignments.percent}%`} />
        <StatCard label="Quiz grades" value={`${overview.grades.quizzes.percent}%`} />
        <StatCard label="Certificates" value={overview.certificates} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course progress</CardTitle>
            <CardDescription>Lessons completed in each enrolled course.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {overview.progress.map((row) => (
                <li key={row.courseId} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{row.title}</span>
                    <span className="text-muted-foreground">{row.percent}%</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="meter"
                    aria-label={`${row.title} progress`}
                    aria-valuenow={row.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full bg-brand" style={{ width: `${row.percent}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.completedLessons} of {row.totalLessons} lessons
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming work</CardTitle>
            <CardDescription>Published assignments due in the next 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <figure role="img" aria-label="Bar chart of grades by assessment type">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { type: 'Assignments', percent: overview.grades.assignments.percent },
                      { type: 'Quizzes', percent: overview.grades.quizzes.percent },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="type" stroke="var(--muted-foreground)" />
                    <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Bar dataKey="percent" fill="var(--brand)" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">
                Assignment average {overview.grades.assignments.percent} percent, quiz average{' '}
                {overview.grades.quizzes.percent} percent.
              </figcaption>
            </figure>
            <ul className="mt-4 space-y-2 text-sm">
              {overview.upcomingAssignments.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.dueAt === null
                      ? 'No due date'
                      : new Date(item.dueAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: queryKeys.analytics.overview,
    queryFn: fetchAnalyticsOverview,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A role-aware summary of learning activity.
        </p>
      </div>

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading dashboard">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm">
          <p>{query.error.message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : query.data.role === 'admin' ? (
        <AdminDashboard overview={query.data} />
      ) : query.data.role === 'instructor' ? (
        <InstructorDashboard overview={query.data} />
      ) : (
        <StudentDashboard overview={query.data} />
      )}
    </div>
  );
}
