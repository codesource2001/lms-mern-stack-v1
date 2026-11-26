import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { env } from '../config/env.js';
import { registerAuthOpenApi } from '../modules/auth/auth.openapi.js';
import { registerCertificateOpenApi } from '../modules/certificates/certificate.openapi.js';
import { registerUserOpenApi } from '../modules/users/user.openapi.js';
import { registerNotificationOpenApi } from '../modules/notifications/notification.openapi.js';
import { registerAnnouncementOpenApi } from '../modules/announcements/announcement.openapi.js';
import { registerAnalyticsOpenApi } from '../modules/analytics/analytics.openapi.js';
import { registerCourseOpenApi } from '../modules/courses/course.openapi.js';
import { registerLessonOpenApi } from '../modules/lessons/lesson.openapi.js';
import { registerEnrollmentOpenApi } from '../modules/enrollments/enrollment.openapi.js';
import { registerAssignmentOpenApi } from '../modules/assignments/assignment.openapi.js';
import { registerQuizOpenApi } from '../modules/quizzes/quiz.openapi.js';

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
registerCertificateOpenApi(registry);
registerNotificationOpenApi(registry);
registerAnnouncementOpenApi(registry);
registerAnalyticsOpenApi(registry);
registerCourseOpenApi(registry);
registerLessonOpenApi(registry);
registerEnrollmentOpenApi(registry);
registerAssignmentOpenApi(registry);
registerQuizOpenApi(registry);

const generator = new OpenApiGeneratorV31(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Atrium LMS API',
    version: env.APP_VERSION,
    description:
      'Phase 15 API contract. Authentication, RBAC, catalog, learning, assessments, certificates, notifications, announcements, and role-scoped analytics are documented. Path-level summaries describe each endpoint; request schemas are documented where Zod registration exists.',
  },
  servers: [{ url: '/', description: 'Current origin' }],
  tags: [
    { name: 'Operations', description: 'Liveness, readiness, and service metadata' },
    { name: 'Discovery', description: 'API discovery metadata' },
    { name: 'Authentication', description: 'Account lifecycle and session management' },
    { name: 'Users', description: 'User management' },
    { name: 'Certificates', description: 'Certificate issuance, verification, and download' },
    {
      name: 'Notifications',
      description: 'In-app notifications, email delivery state, and preferences',
    },
    { name: 'Announcements', description: 'Course announcements and notification fan-out' },
    { name: 'Analytics', description: 'Role-scoped platform, instructor, and learner analytics' },
    { name: 'Categories', description: 'Course category hierarchy' },
    { name: 'Courses', description: 'Catalog, course lifecycle, sections, and thumbnails' },
    { name: 'Lessons', description: 'Lesson content, completion, and protected assets' },
    { name: 'Enrollments', description: 'Enrollment lifecycle and learner progress' },
    { name: 'Assignments', description: 'Assignments, submissions, and grading' },
    { name: 'Quizzes', description: 'Question banks, quizzes, attempts, and grading' },
  ],
});
