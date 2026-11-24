import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { env } from '../../config/env.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.validation.js';

const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  status: z.enum(['pending_verification', 'active', 'suspended']),
  roles: z.array(z.object({ slug: z.string(), name: z.string() })),
  permissions: z.array(z.string()),
  emailVerified: z.boolean(),
});

const authResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    accessToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().positive(),
    user: authUserSchema,
  }),
});

const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.record(z.string(), z.unknown()),
});

const errorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  code: z.string(),
  requestId: z.string().optional(),
});

export function registerAuthOpenApi(registry: OpenAPIRegistry): void {
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  const authPath = (path: string): string => `${env.API_PREFIX}${path}`;

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/register'),
    tags: ['Authentication'],
    summary: 'Register a new user',
    request: { body: { content: { 'application/json': { schema: registerSchema } } } },
    responses: {
      201: {
        description: 'Account created',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      409: {
        description: 'Email already registered',
        content: { 'application/json': { schema: errorSchema } },
      },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
      429: {
        description: 'Rate limited',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/verify-email'),
    tags: ['Authentication'],
    summary: 'Verify an email address',
    request: { body: { content: { 'application/json': { schema: verifyEmailSchema } } } },
    responses: {
      200: {
        description: 'Email verified',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      400: {
        description: 'Invalid or expired token',
        content: { 'application/json': { schema: errorSchema } },
      },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/resend-verification'),
    tags: ['Authentication'],
    summary: 'Resend an email verification link',
    request: { body: { content: { 'application/json': { schema: resendVerificationSchema } } } },
    responses: {
      200: {
        description: 'Request accepted',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/login'),
    tags: ['Authentication'],
    summary: 'Sign in',
    request: { body: { content: { 'application/json': { schema: loginSchema } } } },
    responses: {
      200: {
        description: 'Signed in',
        content: { 'application/json': { schema: authResponseSchema } },
      },
      401: {
        description: 'Invalid credentials',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: {
        description: 'Unverified or suspended account',
        content: { 'application/json': { schema: errorSchema } },
      },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
      429: {
        description: 'Rate limited or locked',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/refresh'),
    tags: ['Authentication'],
    summary: 'Refresh an access token using the refresh cookie',
    responses: {
      200: {
        description: 'Session refreshed',
        content: { 'application/json': { schema: authResponseSchema } },
      },
      401: {
        description: 'Invalid or expired session',
        content: { 'application/json': { schema: errorSchema } },
      },
      429: {
        description: 'Rate limited',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/logout'),
    tags: ['Authentication'],
    summary: 'Sign out of the current session',
    responses: {
      200: {
        description: 'Signed out',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: authPath('/auth/me'),
    tags: ['Authentication'],
    summary: 'Current user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Current user',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      401: {
        description: 'Unauthenticated',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: authPath('/auth/me'),
    tags: ['Authentication'],
    summary: 'Update profile',
    security: [{ bearerAuth: [] }],
    request: { body: { content: { 'application/json': { schema: updateProfileSchema } } } },
    responses: {
      200: {
        description: 'Profile updated',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      401: {
        description: 'Unauthenticated',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorSchema } } },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/change-password'),
    tags: ['Authentication'],
    summary: 'Change password',
    security: [{ bearerAuth: [] }],
    request: { body: { content: { 'application/json': { schema: changePasswordSchema } } } },
    responses: {
      200: {
        description: 'Password changed',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      401: {
        description: 'Unauthenticated or invalid current password',
        content: { 'application/json': { schema: errorSchema } },
      },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/logout-all'),
    tags: ['Authentication'],
    summary: 'Sign out of all sessions',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Signed out everywhere',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      401: {
        description: 'Unauthenticated',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/forgot-password'),
    tags: ['Authentication'],
    summary: 'Request a password reset link',
    request: { body: { content: { 'application/json': { schema: forgotPasswordSchema } } } },
    responses: {
      200: {
        description: 'Request accepted',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: authPath('/auth/reset-password'),
    tags: ['Authentication'],
    summary: 'Reset a password using a reset token',
    request: { body: { content: { 'application/json': { schema: resetPasswordSchema } } } },
    responses: {
      200: {
        description: 'Password reset',
        content: { 'application/json': { schema: messageResponseSchema } },
      },
      400: {
        description: 'Invalid or expired token',
        content: { 'application/json': { schema: errorSchema } },
      },
      422: {
        description: 'Validation failed',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  });
}
