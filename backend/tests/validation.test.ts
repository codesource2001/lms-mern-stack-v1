import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { errorHandler } from '../src/middlewares/error-handler.js';
import { requestId } from '../src/middlewares/request-id.js';
import { getValidated, validate } from '../src/middlewares/validate.js';
import { identifierSchema } from '../src/shared/query/filtering.js';
import { paginationQuerySchema } from '../src/shared/query/pagination.js';

interface ValidationErrorBody {
  success: false;
  message: string;
  code: string;
  requestId: string;
  errors: Array<{ field: string; message: string; code?: string }>;
}

const bodySchema = z.object({
  email: z.email(),
  age: z.coerce.number().int().min(18),
  name: z.string().trim().min(1),
});

interface BodyPayload {
  email: string;
  age: number;
  name: string;
}

function createTestApp(): express.Express {
  const app = express();

  app.use(requestId);
  app.use(express.json());

  app.post(
    '/users/:id',
    validate({
      params: z.object({ id: identifierSchema }),
      body: bodySchema,
    }),
    (req, res) => {
      res.json({
        success: true,
        data: {
          params: getValidated<{ id: string }>(req, 'params'),
          body: getValidated<BodyPayload>(req, 'body'),
        },
      });
    },
  );

  app.get('/search', validate({ query: paginationQuerySchema }), (req, res) => {
    res.json({
      success: true,
      data: getValidated<{ page: number; limit: number }>(req, 'query'),
    });
  });

  app.use(errorHandler);

  return app;
}

const app = createTestApp();
const validId = '507f1f77bcf86cd799439011';

describe('request validation middleware', () => {
  it('passes parsed body and params to the handler and strips unknown fields', async () => {
    const response = await request(app)
      .post(`/users/${validId}`)
      .send({ email: 'ada@example.com', age: '31', name: '  Ada  ', role: 'admin' })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        params: { id: validId },
        body: { email: 'ada@example.com', age: 31, name: 'Ada' },
      },
    });
  });

  it('returns one 422 envelope with source-qualified field errors', async () => {
    const response = await request(app)
      .post('/users/not-an-object-id')
      .send({ email: 'not-an-email', age: 12, name: '' })
      .expect(422);
    const body = response.body as ValidationErrorBody;

    expect(body).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    });
    expect(body.requestId).toBe(response.headers['x-request-id']);

    const fields = body.errors.map((error) => error.field);
    expect(fields).toEqual(
      expect.arrayContaining(['params.id', 'body.email', 'body.age', 'body.name']),
    );
    expect(response.text).not.toContain('stack');
  });

  it('coerces and bounds pagination query values', async () => {
    const response = await request(app).get('/search?page=2&limit=50').expect(200);

    expect(response.body).toEqual({
      success: true,
      data: { page: 2, limit: 50 },
    });
  });

  it('rejects a page size above the hard maximum', async () => {
    const response = await request(app).get('/search?limit=101').expect(422);
    const body = response.body as ValidationErrorBody;

    expect(body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'query.limit' })]),
    );
  });
});
