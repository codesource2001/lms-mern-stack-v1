import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { assignmentController, upload } from './assignment.controller.js';
import {
  validateAssignmentCreate,
  validateAssignmentUpdate,
  validateSubmission,
  validateGrade,
} from './assignment.validation.js';
import { mutatingLimiter, uploadLimiter } from '../../middlewares/endpoint-rate-limit.js';
import { validateIdParam } from '../../middlewares/validate-id.js';

export function createAssignmentRouter() {
  const router = Router();

  router.get(
    '/mine',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_SUBMIT),
    assignmentController.mine,
  );

  router.get(
    '/course/:courseId',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_READ),
    validateIdParam('courseId'),
    assignmentController.list,
  );
  router.post(
    '/course/:courseId',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    mutatingLimiter,
    validateIdParam('courseId'),
    validateAssignmentCreate,
    assignmentController.create,
  );

  router.get(
    '/:id/submissions',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_GRADE),
    validateIdParam('id'),
    assignmentController.submissions,
  );
  router.post(
    '/:id/submit',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_SUBMIT),
    uploadLimiter,
    validateIdParam('id'),
    upload.single('file'),
    validateSubmission,
    assignmentController.submit,
  );
  router.post(
    '/:id/publish',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    assignmentController.publish,
  );
  router.patch(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    validateAssignmentUpdate,
    assignmentController.update,
  );
  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    assignmentController.remove,
  );

  router.post(
    '/submissions/:submissionId/grade',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_GRADE),
    mutatingLimiter,
    validateIdParam('submissionId'),
    validateGrade,
    assignmentController.grade,
  );

  return router;
}

export const assignmentRouter = createAssignmentRouter();
