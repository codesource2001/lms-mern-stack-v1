import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { env } from '../../config/env.js';

export function registerAnnouncementOpenApi(registry: OpenAPIRegistry): void {
  const apiPath = (path: string): string => `${env.API_PREFIX}${path}`;

  registry.registerPath({
    method: 'post',
    path: apiPath('/announcements'),
    tags: ['Announcements'],
    summary: 'Publish a course announcement',
    description:
      'Course instructors and administrators only. Notification fan-out runs as an idempotent background job.',
    security: [{ bearerAuth: [] }],
    responses: {
      201: { description: 'Announcement published' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Not the course instructor' },
      404: { description: 'Course not found' },
      422: { description: 'Invalid announcement payload' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: apiPath('/announcements/course/{courseId}'),
    tags: ['Announcements'],
    summary: 'List announcements for a course',
    description: 'Available to enrolled learners, the course instructor, and administrators.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Announcement page with pagination metadata' },
      401: { description: 'Unauthenticated' },
      404: { description: 'Course not found or inaccessible' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: apiPath('/announcements/{id}'),
    tags: ['Announcements'],
    summary: 'Delete an announcement',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Announcement deleted' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Not the course instructor or an administrator' },
      404: { description: 'Announcement not found' },
    },
  });
}
