import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

const app = createApp();

interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  requestId: string;
}

describe('HTTP error contract', () => {
  it('returns a consistent envelope for unknown routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').expect(404);
    const body = response.body as ErrorResponse;

    expect(body).toMatchObject({
      success: false,
      message: 'Route GET /api/v1/does-not-exist not found',
      code: 'NOT_FOUND',
    });
    expect(body.requestId).toBe(response.headers['x-request-id']);
  });

  it('rejects malformed JSON with a 400 envelope', async () => {
    const response = await request(app)
      .post('/api/v1')
      .set('Content-Type', 'application/json')
      .send('{"unterminated":')
      .expect(400);
    const body = response.body as ErrorResponse;

    expect(body).toMatchObject({
      success: false,
      code: 'INVALID_JSON',
    });
    expect(body.requestId).toBe(response.headers['x-request-id']);
  });

  it('does not expose stack traces on errors', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').expect(404);

    expect(response.text).not.toContain('stack');
  });
});
