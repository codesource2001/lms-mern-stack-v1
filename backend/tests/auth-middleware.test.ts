import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler, notFoundHandler } from '../src/middlewares/error-handler.js';
import { createRequireAuth, requirePermission } from '../src/modules/auth/auth.middleware.js';

describe('auth middleware', () => {
  function appWithPermissions(permissions: string[]) {
    const service = {
      accessTokens: {
        verify: vi.fn(() => ({ userId: 'user-1', sessionId: 'session-1', tokenVersion: 0 })),
      },
      resolvePrincipal: vi.fn(() => ({
        userId: 'user-1',
        sessionId: 'session-1',
        name: 'Ada',
        email: 'ada@example.com',
        roles: ['student'],
        permissions,
        tokenVersion: 0,
      })),
    };

    const app = express();
    const requireAuth = createRequireAuth(service as never);
    app.get('/protected', requireAuth, requirePermission('profile:read'), (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.get('/missing', requireAuth, requirePermission('profile:read'), (_req, res) => {
      res.status(404).json({ success: false, code: 'NOT_FOUND' });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);

    return { app, service };
  }

  it('returns 401 without an access token', async () => {
    const { app } = appWithPermissions(['profile:read']);

    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect((response.body as { code?: string }).code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 for an invalid access token', async () => {
    const { app, service } = appWithPermissions(['profile:read']);
    service.accessTokens.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    const response = await request(app).get('/protected').set('Authorization', 'Bearer bad-token');

    expect(response.status).toBe(401);
    expect((response.body as { code?: string }).code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('returns 401 for an expired access token', async () => {
    const { app, service } = appWithPermissions(['profile:read']);
    const error = new Error('expired');
    (error as { reason?: string }).reason = 'expired';
    service.accessTokens.verify.mockImplementation(() => {
      throw error;
    });

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer expired-token');

    expect(response.status).toBe(401);
    expect((response.body as { code?: string }).code).toBe('ACCESS_TOKEN_EXPIRED');
  });

  it('returns 403 when the permission is missing', async () => {
    const { app } = appWithPermissions([]);

    const response = await request(app).get('/protected').set('Authorization', 'Bearer good-token');

    expect(response.status).toBe(403);
    expect((response.body as { code?: string }).code).toBe('FORBIDDEN');
  });

  it('returns 200 when authenticated and authorized', async () => {
    const { app } = appWithPermissions(['profile:read']);

    const response = await request(app).get('/protected').set('Authorization', 'Bearer good-token');

    expect(response.status).toBe(200);
  });

  it('preserves 404 for an authorized missing resource', async () => {
    const { app } = appWithPermissions(['profile:read']);

    const response = await request(app).get('/missing').set('Authorization', 'Bearer good-token');

    expect(response.status).toBe(404);
    expect((response.body as { code?: string }).code).toBe('NOT_FOUND');
  });
});
