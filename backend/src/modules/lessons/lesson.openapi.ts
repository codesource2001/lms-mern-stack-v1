import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { registerRouteDocs, type RouteDoc } from '../../docs/openapi-route.js';

const lessonRoutes: readonly RouteDoc[] = [
  {
    method: 'patch',
    path: '/lessons/{id}',
    summary: 'Update a lesson you own',
    responses: { 200: 'Lesson updated', 403: 'Forbidden', 404: 'Lesson not found' },
  },
  {
    method: 'delete',
    path: '/lessons/{id}',
    summary: 'Delete a lesson',
    responses: { 200: 'Lesson deleted', 403: 'Forbidden', 404: 'Lesson not found' },
  },
  {
    method: 'post',
    path: '/lessons/{id}/complete',
    summary: 'Mark a lesson complete for the current learner',
    description: 'Requires active access to the course that contains the lesson.',
    responses: { 200: 'Completion recorded', 403: 'Forbidden', 404: 'Lesson not found' },
  },
  {
    method: 'get',
    path: '/lessons/{id}/asset',
    summary: 'Stream a protected lesson asset',
    description: 'Owners and administrators bypass enrollment; other learners need active access.',
    responses: { 200: 'Asset stream', 403: 'Forbidden', 404: 'Asset not found' },
  },
];

export function registerLessonOpenApi(registry: OpenAPIRegistry): void {
  registerRouteDocs(registry, 'Lessons', lessonRoutes);
}
