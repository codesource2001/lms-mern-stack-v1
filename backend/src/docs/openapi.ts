import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { env } from '../config/env.js';
import { registerAuthOpenApi } from '../modules/auth/auth.openapi.js';
import { registerUserOpenApi } from '../modules/users/user.openapi.js';

extendZodWithOpenApi(z);

const dependencyCheckSchema = z.object({
  status: z.enum(['up', 'down']),
  latencyMs: z.number().nonnegative(),
});

const readinessChecksSchema = z.object({
  mongodb: dependencyCheckSchema,
  redis: dependencyCheckSchema,
});

const healthDataSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('atrium-api'),
  version: z.string(),
  environment: z.enum(['development', 'test', 'production']),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string(),
});

const healthResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: healthDataSchema,
});

const apiRootDataSchema = z.object({
  name: z.string(),
  version: z.string(),
  apiVersion: z.literal('v1'),
});

const apiRootResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: apiRootDataSchema,
});

const readinessDataSchema = z.object({
  status: z.literal('ready'),
  checkedAt: z.string(),
  checks: readinessChecksSchema,
});

const readinessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: readinessDataSchema,
});

const errorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  code: z.string(),
  requestId: z.string().optional(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
        code: z.string().optional(),
      }),
    )
    .optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const registry = new OpenAPIRegistry();

registry.register('HealthResponse', healthResponseSchema);
registry.register('ApiRootResponse', apiRootResponseSchema);
registry.register('ReadinessResponse', readinessResponseSchema);
registry.register('ErrorResponse', errorSchema);

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Operations'],
  summary: 'Liveness probe',
  description:
    'Reports process liveness without checking MongoDB or Redis. Safe for container liveness checks.',
  responses: {
    200: {
      description: 'Process is alive',
      content: { 'application/json': { schema: healthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/ready',
  tags: ['Operations'],
  summary: 'Readiness probe',
  description:
    'Checks MongoDB and Redis with a bounded timeout. Returns 503 when either dependency is unavailable.',
  responses: {
    200: {
      description: 'All required dependencies are reachable',
      content: { 'application/json': { schema: readinessResponseSchema } },
    },
    503: {
      description: 'One or more dependencies are unavailable',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: env.API_PREFIX,
  tags: ['Discovery'],
  summary: 'API discovery',
  description: 'Returns the API name and version for the configured prefix.',
  responses: {
    200: {
      description: 'API metadata',
      content: { 'application/json': { schema: apiRootResponseSchema } },
    },
  },
});

registerAuthOpenApi(registry);
registerUserOpenApi(registry);

const generator = new OpenApiGeneratorV31(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Atrium LMS API',
    version: env.APP_VERSION,
    description:
      'Phase 3 API contract. Authentication and RBAC are implemented; domain resources are introduced in later phases.',
  },
  servers: [{ url: '/', description: 'Current origin' }],
  tags: [
    { name: 'Operations', description: 'Liveness, readiness, and service metadata' },
    { name: 'Discovery', description: 'API discovery metadata' },
    { name: 'Authentication', description: 'Account lifecycle and session management' },
    { name: 'Users', description: 'User management' },
  ],
});
