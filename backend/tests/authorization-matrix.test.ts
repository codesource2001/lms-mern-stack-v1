/* eslint-disable */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import { analyticsService } from '../src/modules/analytics/analytics.service.js';
import { certificateService } from '../src/modules/certificates/certificate.service.js';
import { courseService } from '../src/modules/courses/course.service.js';
import { authService } from '../src/modules/auth/auth.service.js';

const protectedRoutes: Array<{ method: 'get' | 'post'; path: string }> = [
  { method: 'get', path: '/api/v1/users' },
  { method: 'get', path: '/api/v1/users/user-1' },
  { method: 'get', path: '/api/v1/analytics/overview' },
  { method: 'get', path: '/api/v1/notifications' },
  { method: 'get', path: '/api/v1/notifications/unread-count' },
  { method: 'get', path: '/api/v1/notifications/preferences' },
  { method: 'get', path: '/api/v1/courses/mine' },
  { method: 'get', path: '/api/v1/enrollments/mine' },
  { method: 'get', path: '/api/v1/assignments/mine' },
  { method: 'get', path: '/api/v1/assignments/course/course-1' },
  { method: 'get', path: '/api/v1/quizzes/attempts/attempt-1' },
  { method: 'get', path: '/api/v1/lessons/lesson-1/asset' },
  { method: 'get', path: '/api/v1/certificates/mine' },
  { method: 'post', path: '/api/v1/courses' },
  { method: 'post', path: '/api/v1/announcements' },
  { method: 'post', path: '/api/v1/enrollments' },
  { method: 'post', path: '/api/v1/lessons/lesson-1/complete' },
  { method: 'post', path: '/api/v1/quizzes/banks' },
];

function principal(roles: string[], permissions: string[]) {
  return {
    userId: roles.includes('admin') ? 'admin' : 'guest',
    sessionId: 'session-1',
    name: 'Test User',
    email: 'test@example.com',
    roles,
    permissions,
    tokenVersion: 0,
  };
}

function makeApp() {
  vi.spyOn(authService.accessTokens, 'verify').mockImplementation((token: string) => ({
    userId: token,
    sessionId: 'session-1',
    tokenVersion: 0,
  }));
  vi.spyOn(authService, 'resolvePrincipal').mockImplementation(
    async (claims: { userId: string }) =>
      claims.userId === 'admin'
        ? principal(['admin'], ['analytics:read', 'notifications:read', 'users:read'])
        : principal(['guest'], []),
  );

  return createApp({ enableDocs: false });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HTTP authorization matrix', () => {
  it('denies every protected route without an access token', async () => {
    const app = makeApp();

    for (const route of protectedRoutes) {
      const response = await request(app)[route.method](route.path);
      expect(response.status, `${route.method.toUpperCase()} ${route.path}`).toBe(401);
      expect(response.body).toMatchObject({ success: false, code: 'AUTH_REQUIRED' });
    }
  });

  it('returns 403 when the principal lacks the route permission', async () => {
    const app = makeApp();

    const analytics = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer guest');
    const users = await request(app).get('/api/v1/users').set('Authorization', 'Bearer guest');

    expect(analytics.status).toBe(403);
    expect(users.status).toBe(403);
    expect(analytics.body.code).toBe('FORBIDDEN');
  });

  it('reaches the service for an authorized principal', async () => {
    const overview = vi.spyOn(analyticsService, 'getOverview').mockResolvedValue({
      role: 'admin',
      users: {
        total: 1,
        active: 1,
        suspended: 0,
        pendingVerification: 0,
        students: 1,
        instructors: 0,
      },
      courses: { total: 0, published: 0, draft: 0, submitted: 0, archived: 0 },
      enrollments: {
        total: 0,
        active: 0,
        pendingPayment: 0,
        expired: 0,
        revoked: 0,
        activeStudents: 0,
      },
      revenueByCurrency: [],
      completionRate: 0,
      certificates: { issued: 0, active: 0, revoked: 0 },
      enrollmentTrend: [],
      topCourses: [],
    });
    const app = makeApp();

    const response = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer admin');

    expect(response.status).toBe(200);
    expect(response.body.data.overview.role).toBe('admin');
    expect(overview).toHaveBeenCalledWith(expect.objectContaining({ userId: 'admin' }));
  });

  it('rejects malformed route parameters', async () => {
    const app = makeApp();
    const longId = 'a'.repeat(101);

    const response = await request(app).get(`/api/v1/certificates/verify/${longId}`);

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('rate-limits the unauthenticated certificate verification endpoint', async () => {
    vi.spyOn(certificateService, 'verify').mockResolvedValue({ status: 'invalid' } as never);
    vi.spyOn(courseService, 'listPublic').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    } as never);
    const app = makeApp();

    let lastStatus = 200;
    for (let index = 0; index < 61; index += 1) {
      lastStatus = (await request(app).get('/api/v1/certificates/verify/CRT-short')).status;
    }

    expect(lastStatus).toBe(429);
  });
});
