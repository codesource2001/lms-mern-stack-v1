import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { env } from '../../config/env.js';

export function registerNotificationOpenApi(registry: OpenAPIRegistry): void {
  const apiPath = (path: string): string => `${env.API_PREFIX}${path}`;

  registry.registerPath({
    method: 'get',
    path: apiPath('/notifications'),
    tags: ['Notifications'],
    summary: 'List notifications for the current user',
    description: 'Paginated, newest first. Set unreadOnly=true to filter unread items.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Notification page with pagination metadata' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Missing notification permission' },
      422: { description: 'Invalid query parameters' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: apiPath('/notifications/unread-count'),
    tags: ['Notifications'],
    summary: 'Count unread notifications for the current user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Unread count' },
      401: { description: 'Unauthenticated' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: apiPath('/notifications/preferences'),
    tags: ['Notifications'],
    summary: 'Get notification preferences',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'In-app and email preferences by category' },
      401: { description: 'Unauthenticated' },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: apiPath('/notifications/preferences'),
    tags: ['Notifications'],
    summary: 'Update notification preferences',
    description:
      'Only supplied categories and channels are changed; unspecified values keep their defaults.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Updated preferences' },
      401: { description: 'Unauthenticated' },
      422: { description: 'Invalid preference payload' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: apiPath('/notifications/read-all'),
    tags: ['Notifications'],
    summary: 'Mark all notifications as read for the current user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Number of notifications updated' },
      401: { description: 'Unauthenticated' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: apiPath('/notifications/{id}/read'),
    tags: ['Notifications'],
    summary: 'Mark one notification as read',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Updated notification' },
      401: { description: 'Unauthenticated' },
      404: { description: 'Notification not found or owned by another user' },
    },
  });
}
