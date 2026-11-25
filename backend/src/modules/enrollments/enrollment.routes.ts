import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { enrollmentController } from './enrollment.controller.js';
import { validateEnroll } from './enrollment.validation.js';
import { mutatingLimiter } from '../../middlewares/endpoint-rate-limit.js';
import { validateIdParam } from '../../middlewares/validate-id.js';

export function createEnrollmentRouter() {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.ENROLLMENTS_CREATE),
    mutatingLimiter,
    validateEnroll,
    enrollmentController.enroll,
  );
  router.get(
    '/mine',
    requireAuth,
    requirePermission(PERMISSIONS.ENROLLMENTS_READ),
    enrollmentController.mine,
  );
  router.post(
    '/:id/revoke',
    requireAuth,
    requirePermission(PERMISSIONS.ENROLLMENTS_MANAGE),
    mutatingLimiter,
    validateIdParam('id'),
    enrollmentController.revoke,
  );
  router.post(
    '/:id/activate',
    requireAuth,
    requirePermission(PERMISSIONS.ENROLLMENTS_MANAGE),
    mutatingLimiter,
    validateIdParam('id'),
    enrollmentController.activate,
  );

  return router;
}

export const enrollmentRouter = createEnrollmentRouter();
