import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { registerRouteDocs, type RouteDoc } from '../../docs/openapi-route.js';

const enrollmentRoutes: readonly RouteDoc[] = [
  {
    method: 'post',
    path: '/enrollments',
    summary: 'Enroll in a published course',
    description: 'Free courses become active immediately; paid courses start as pending_payment.',
    responses: {
      201: 'Enrolled',
      404: 'Course not found',
      409: 'Already enrolled',
      422: 'Invalid course id',
    },
  },
  {
    method: 'get',
    path: '/enrollments/mine',
    summary: 'List your enrollments with progress',
    responses: { 200: 'Enrollment and progress list', 401: 'Unauthenticated' },
  },
  {
    method: 'post',
    path: '/enrollments/{id}/revoke',
    summary: 'Revoke an enrollment',
    description: 'Administrative action; writes an audit entry.',
    responses: { 200: 'Enrollment revoked', 401: 'Unauthenticated', 404: 'Enrollment not found' },
  },
  {
    method: 'post',
    path: '/enrollments/{id}/activate',
    summary: 'Activate a pending enrollment',
    description: 'Administrative action after payment confirmation; writes an audit entry.',
    responses: { 200: 'Enrollment activated', 401: 'Unauthenticated', 404: 'Enrollment not found' },
  },
];

export function registerEnrollmentOpenApi(registry: OpenAPIRegistry): void {
  registerRouteDocs(registry, 'Enrollments', enrollmentRoutes);
}
