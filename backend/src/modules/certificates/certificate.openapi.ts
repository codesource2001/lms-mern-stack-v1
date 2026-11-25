import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { env } from '../../config/env.js';

export function registerCertificateOpenApi(registry: OpenAPIRegistry): void {
  const apiPath = (path: string): string => `${env.API_PREFIX}${path}`;

  registry.registerPath({
    method: 'post',
    path: apiPath('/certificates'),
    tags: ['Certificates'],
    summary: 'Issue your certificate for a completed course',
    description:
      'Idempotent. Returns the existing active certificate when one has already been issued. Requires an active enrollment and completion of every lesson.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Certificate already active' },
      201: { description: 'Certificate issued' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Enrollment is not active' },
      404: { description: 'Course not found' },
      409: { description: 'Course is not complete or issuance conflicted' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: apiPath('/certificates/issue'),
    tags: ['Certificates'],
    summary: 'Issue a certificate for a learner (admin)',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Certificate already active' },
      201: { description: 'Certificate issued' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Forbidden' },
      404: { description: 'Course or user not found' },
      409: { description: 'Course is not complete or issuance conflicted' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: apiPath('/certificates/mine'),
    tags: ['Certificates'],
    summary: 'List your certificates',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Certificates including revoked history' },
      401: { description: 'Unauthenticated' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: apiPath('/certificates/verify/{certificateId}'),
    tags: ['Certificates'],
    summary: 'Verify a certificate publicly',
    description:
      'Returns the recipient name, course title, issue date, and validity only. No email address or internal identifiers are disclosed.',
    responses: {
      200: { description: 'Certificate verification result' },
      404: { description: 'Certificate not found' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: apiPath('/certificates/{certificateId}/revoke'),
    tags: ['Certificates'],
    summary: 'Revoke a certificate (admin)',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Certificate revoked' },
      401: { description: 'Unauthenticated' },
      403: { description: 'Forbidden' },
      404: { description: 'Certificate not found' },
      409: { description: 'Certificate is already revoked' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: apiPath('/certificates/{certificateId}/pdf'),
    tags: ['Certificates'],
    summary: 'Download a certificate PDF',
    description: 'Owners and administrators only. Revoked certificates return 404.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Certificate PDF',
        content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
      },
      401: { description: 'Unauthenticated' },
      404: { description: 'Certificate not found' },
    },
  });
}
