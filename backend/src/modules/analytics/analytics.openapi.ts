import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { env } from '../../config/env.js';

export function registerAnalyticsOpenApi(registry: OpenAPIRegistry): void {
  const apiPath = (path: string): string => `${env.API_PREFIX}${path}`;

  registry.registerPath({
    method: 'get',
    path: apiPath('/analytics/overview'),
    tags: ['Analytics'],
    summary: 'Get a role-scoped analytics overview',
    description:
      'Administrators receive platform-wide counts and bounded trends. Instructors receive performance for courses they teach. Students receive their own progress, grades, and upcoming assignments. All aggregates have hard result limits.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Overview shaped by the caller role' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Missing analytics permission or unsupported role' },
    },
  });
}
