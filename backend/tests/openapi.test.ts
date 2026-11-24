import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { openApiDocument } from '../src/docs/openapi.js';
import type { ReadinessReport } from '../src/infrastructure/types.js';

const readyReport: ReadinessReport = {
  status: 'ready',
  checkedAt: '2026-11-24T16:00:00.000Z',
  checks: {
    mongodb: { status: 'up', latencyMs: 1 },
    redis: { status: 'up', latencyMs: 1 },
  },
};

describe('OpenAPI contract', () => {
  it('documents every implemented endpoint', () => {
    expect(openApiDocument.openapi).toBe('3.1.0');
    expect(openApiDocument.info.title).toBe('Atrium LMS API');
    expect(openApiDocument.paths).toHaveProperty('/health');
    expect(openApiDocument.paths).toHaveProperty('/health/ready');
    expect(openApiDocument.paths).toHaveProperty('/api/v1');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/auth/register');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/auth/login');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/auth/refresh');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/auth/me');
  });

  it('serves the generated document and Swagger UI outside production', async () => {
    const app = createApp({
      enableDocs: true,
      readinessCheck: () => Promise.resolve(readyReport),
    });

    const documentResponse = await request(app).get('/api-docs/openapi.json').expect(200);
    const uiResponse = await request(app).get('/api-docs/').expect(200);

    expect(documentResponse.body).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'Atrium LMS API' },
    });
    expect(uiResponse.text).toContain('id="swagger-ui"');
    expect(uiResponse.text).toContain('Atrium LMS API reference');
  });

  it('does not mount documentation when disabled', async () => {
    const app = createApp({
      enableDocs: false,
      readinessCheck: () => Promise.resolve(readyReport),
    });

    await request(app).get('/api-docs/openapi.json').expect(404);
  });
});
