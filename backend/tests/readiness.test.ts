import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import type { ReadinessReport } from '../src/infrastructure/types.js';

const readyReport: ReadinessReport = {
  status: 'ready',
  checkedAt: '2026-11-24T16:00:00.000Z',
  checks: {
    mongodb: { status: 'up', latencyMs: 2 },
    redis: { status: 'up', latencyMs: 1 },
  },
};

const notReadyReport: ReadinessReport = {
  status: 'not_ready',
  checkedAt: '2026-11-24T16:00:00.000Z',
  checks: {
    mongodb: { status: 'up', latencyMs: 2 },
    redis: { status: 'down', latencyMs: 0 },
  },
};

interface ReadinessBody {
  success: boolean;
  data: {
    status: string;
    checkedAt: string;
    checks: Record<string, { status: string; latencyMs: number }>;
  };
}

interface ReadinessErrorBody {
  success: false;
  code: string;
  message: string;
  requestId: string;
  context: {
    checks: Record<string, { status: string; latencyMs: number }>;
  };
}

describe('GET /health/ready', () => {
  it('reports ready when every dependency is reachable', async () => {
    const app = createApp({
      enableDocs: false,
      readinessCheck: () => Promise.resolve(readyReport),
    });

    const response = await request(app).get('/health/ready').expect(200);
    const body = response.body as ReadinessBody;

    expect(body).toMatchObject({
      success: true,
      message: 'Service is ready',
      data: {
        status: 'ready',
        checkedAt: readyReport.checkedAt,
        checks: readyReport.checks,
      },
    });
  });

  it('returns 503 with dependency detail when a dependency is down', async () => {
    const app = createApp({
      enableDocs: false,
      readinessCheck: () => Promise.resolve(notReadyReport),
    });

    const response = await request(app).get('/health/ready').expect(503);
    const body = response.body as ReadinessErrorBody;

    expect(body).toMatchObject({
      success: false,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service is not ready',
      context: { checks: notReadyReport.checks },
    });
    expect(body.requestId).toBe(response.headers['x-request-id']);
    expect(response.text).not.toContain('stack');
  });

  it('keeps liveness independent from dependency checks', async () => {
    const readinessCheck = vi.fn(() => Promise.resolve(notReadyReport));
    const app = createApp({ enableDocs: false, readinessCheck });

    await request(app).get('/health').expect(200);

    expect(readinessCheck).not.toHaveBeenCalled();
  });
});
