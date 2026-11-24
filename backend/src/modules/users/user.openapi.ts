import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { env } from '../../config/env.js';

export function registerUserOpenApi(registry: OpenAPIRegistry): void {
  const authPath = (path: string): string => `${env.API_PREFIX}${path}`;

  registry.registerPath({
    method: 'get',
    path: authPath('/users'),
    tags: ['Users'],
    summary: 'List users',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Users' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Forbidden' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: authPath('/users/{id}'),
    tags: ['Users'],
    summary: 'Get a user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'User' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: authPath('/users/{id}'),
    tags: ['Users'],
    summary: 'Update a user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'User updated' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/users/{id}/suspend'),
    tags: ['Users'],
    summary: 'Suspend a user',
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: 'User suspended' } },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/users/{id}/reactivate'),
    tags: ['Users'],
    summary: 'Reactivate a user',
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: 'User reactivated' } },
  });

  registry.registerPath({
    method: 'delete',
    path: authPath('/users/{id}'),
    tags: ['Users'],
    summary: 'Soft-delete a user',
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: 'User deleted' } },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/users/me/instructor-application'),
    tags: ['Users'],
    summary: 'Apply to become an instructor',
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: 'Application submitted' } },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/users/{id}/approve-instructor'),
    tags: ['Users'],
    summary: 'Approve an instructor application',
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: 'Instructor approved' } },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/users/{id}/reject-instructor'),
    tags: ['Users'],
    summary: 'Reject an instructor application',
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: 'Instructor rejected' } },
  });
}
