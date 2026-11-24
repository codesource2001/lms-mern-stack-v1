import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

const app = createApp();

interface HealthResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
    service: string;
    version: string;
    environment: string;
    uptimeSeconds: number;
    timestamp: string;
  };
}

interface ApiRootResponse {
  success: boolean;
  message: string;
  data: {
    name: string;
    version: string;
    apiVersion: string;
  };
}

describe('GET /health', () => {
  it('returns a versioned service envelope', async () => {
    const response = await request(app).get('/health').expect(200);
    const body = response.body as HealthResponse;

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(body).toMatchObject({
      success: true,
      message: 'Service is healthy',
      data: {
        status: 'ok',
        service: 'atrium-api',
        environment: 'test',
      },
    });
    expect(body.data.timestamp).toEqual(expect.any(String));
    expect(body.data.uptimeSeconds).toEqual(expect.any(Number));
  });

  it('exposes the versioned API root', async () => {
    const response = await request(app).get('/api/v1').expect(200);
    const body = response.body as ApiRootResponse;

    expect(body).toMatchObject({
      success: true,
      message: 'Atrium API is running',
      data: {
        name: 'Atrium LMS API',
        apiVersion: 'v1',
      },
    });
  });
});
