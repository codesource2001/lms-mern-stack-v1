import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { registerRouteDocs, type RouteDoc } from '../../docs/openapi-route.js';

const assignmentRoutes: readonly RouteDoc[] = [
  {
    method: 'get',
    path: '/assignments/mine',
    summary: 'List your submissions',
    responses: { 200: 'Submission history', 401: 'Unauthenticated' },
  },
  {
    method: 'get',
    path: '/assignments/course/{courseId}',
    summary: 'List assignments in a course',
    description: 'Learners see published assignments; instructors and administrators see all.',
    responses: { 200: 'Assignment list', 401: 'Unauthenticated', 404: 'Course not found' },
  },
  {
    method: 'post',
    path: '/assignments/course/{courseId}',
    summary: 'Create an assignment',
    responses: { 201: 'Assignment created', 403: 'Forbidden', 404: 'Course not found' },
  },
  {
    method: 'get',
    path: '/assignments/{id}/submissions',
    summary: 'List submissions for grading',
    responses: { 200: 'Submission list', 403: 'Forbidden', 404: 'Assignment not found' },
  },
  {
    method: 'post',
    path: '/assignments/{id}/submit',
    summary: 'Submit an assignment',
    description: 'Multipart upload with a 10 MB limit; requires active course access.',
    responses: { 201: 'Submission received', 403: 'Forbidden', 404: 'Assignment not found' },
  },
  {
    method: 'post',
    path: '/assignments/{id}/publish',
    summary: 'Publish an assignment',
    responses: { 200: 'Assignment published', 403: 'Forbidden', 404: 'Assignment not found' },
  },
  {
    method: 'patch',
    path: '/assignments/{id}',
    summary: 'Update an assignment',
    responses: { 200: 'Assignment updated', 403: 'Forbidden', 404: 'Assignment not found' },
  },
  {
    method: 'delete',
    path: '/assignments/{id}',
    summary: 'Delete an assignment',
    responses: { 200: 'Assignment deleted', 403: 'Forbidden', 404: 'Assignment not found' },
  },
  {
    method: 'post',
    path: '/assignments/submissions/{submissionId}/grade',
    summary: 'Grade a submission',
    description: 'Course instructors and administrators only; writes an audit entry.',
    responses: { 200: 'Submission graded', 403: 'Forbidden', 404: 'Submission not found' },
  },
];

export function registerAssignmentOpenApi(registry: OpenAPIRegistry): void {
  registerRouteDocs(registry, 'Assignments', assignmentRoutes);
}
