import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { createUserController } from './user.controller.js';
import {
  validateUserList,
  validateUserUpdate,
  validateInstructorApplication,
} from './user.validation.js';
import { mutatingLimiter } from '../../middlewares/endpoint-rate-limit.js';
import { validateIdParam } from '../../middlewares/validate-id.js';

export function createUserRouter() {
  const router = Router();
  const controller = createUserController();

  router.get(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_READ),
    validateUserList,
    controller.list,
  );
  router.get(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_READ),
    validateIdParam('id'),
    controller.get,
  );
  router.patch(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    validateUserUpdate,
    controller.update,
  );
  router.post(
    '/:id/suspend',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_SUSPEND),
    mutatingLimiter,
    validateIdParam('id'),
    controller.suspend,
  );
  router.post(
    '/:id/reactivate',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_SUSPEND),
    mutatingLimiter,
    validateIdParam('id'),
    controller.reactivate,
  );
  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    controller.remove,
  );

  router.post(
    '/me/instructor-application',
    requireAuth,
    mutatingLimiter,
    validateInstructorApplication,
    controller.applyInstructor,
  );
  router.post(
    '/:id/approve-instructor',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    controller.approveInstructor,
  );
  router.post(
    '/:id/reject-instructor',
    requireAuth,
    requirePermission(PERMISSIONS.USERS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    controller.rejectInstructor,
  );

  return router;
}

export const userRouter = createUserRouter();
