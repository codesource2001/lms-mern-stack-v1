import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { enrollmentController } from './enrollment.controller.js';
import { validateEnroll } from './enrollment.validation.js';

export function createEnrollmentRouter() {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.ENROLLMENTS_CREATE),
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
    enrollmentController.revoke,
  );
  router.post(
    '/:id/activate',
    requireAuth,
    requirePermission(PERMISSIONS.ENROLLMENTS_MANAGE),
    enrollmentController.activate,
  );

  return router;
}

export const enrollmentRouter = createEnrollmentRouter();
