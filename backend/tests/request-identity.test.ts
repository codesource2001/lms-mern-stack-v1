import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

const app = createApp();

describe('request identity', () => {
  it('propagates a valid client request id', async () => {
    const response = await request(app)
      .get('/health')
      .set('x-request-id', 'client-request-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('client-request-123');
  });

  it('replaces an invalid request id with a generated UUID', async () => {
    const response = await request(app).get('/health').set('x-request-id', 'short').expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('CORS allowlist', () => {
  it('allows the configured frontend origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not grant a disallowed origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://untrusted.example')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
