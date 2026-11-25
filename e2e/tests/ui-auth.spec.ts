import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 'user-1',
  name: 'Ada Learner',
  email: 'ada@example.com',
  status: 'active',
  roles: [{ slug: 'student', name: 'Student' }],
  permissions: ['profile:read', 'notifications:read', 'analytics:read'],
  emailVerified: true,
};

function json(body: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function mockRefresh(page: Page, authenticated: boolean) {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill(
      authenticated
        ? json({ success: true, data: { accessToken: 'test-token', user } })
        : json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    ),
  );
}

test('registration submits successfully', async ({ page }) => {
  await mockRefresh(page, false);
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill(json({ success: true, message: 'Account created', data: {} }, 201)),
  );

  await page.goto('/register');
  await page.getByLabel('Name').fill('Ada Learner');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByLabel('Confirm password').fill('Password123!');
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page.getByText('Account created')).toBeVisible();
});

test('login opens the dashboard and the notification center', async ({ page }) => {
  await mockRefresh(page, false);
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill(
      json({
        success: true,
        data: { accessToken: 'test-token', expiresIn: 900, user },
      }),
    ),
  );
  await page.route('**/api/v1/analytics/overview', (route) =>
    route.fulfill(
      json({
        success: true,
        data: {
          overview: {
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
            upcomingAssignments: [],
            certificates: 1,
          },
        },
      }),
    ),
  );
  await page.route('**/api/v1/notifications/unread-count', (route) =>
    route.fulfill(json({ success: true, data: { count: 2 } })),
  );
  await page.route('**/api/v1/notifications/preferences', (route) =>
    route.fulfill(
      json({
        success: true,
        data: {
          preferences: {
            announcements: { inApp: true, email: false },
            deadlines: { inApp: true, email: true },
            grades: { inApp: true, email: true },
            system: { inApp: true, email: false },
          },
        },
      }),
    ),
  );
  await page.route('**/api/v1/notifications?*', (route) =>
    route.fulfill(
      json({
        success: true,
        data: {
          items: [
            {
              id: 'notification-1',
              category: 'deadlines',
              type: 'assignment_due',
              title: 'Assignment due: Final task',
              body: 'Submit before the deadline.',
              link: null,
              courseId: 'course-1',
              readAt: null,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    ),
  );

  await page.goto('/login');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible();
  await expect(page.getByText('Course progress')).toBeVisible();

  await page.getByRole('link', { name: 'Notifications', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /notifications/i })).toBeVisible();
  await expect(page.getByText('Assignment due: Final task')).toBeVisible();
});
