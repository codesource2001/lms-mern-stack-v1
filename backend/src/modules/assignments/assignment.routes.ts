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
    assignmentController.list,
  );
  router.post(
    '/course/:courseId',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    validateAssignmentCreate,
    assignmentController.create,
  );

  router.get(
    '/:id/submissions',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_GRADE),
    assignmentController.submissions,
  );
  router.post(
    '/:id/submit',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_SUBMIT),
    upload.single('file'),
    validateSubmission,
    assignmentController.submit,
  );
  router.post(
    '/:id/publish',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    assignmentController.publish,
  );
  router.patch(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    validateAssignmentUpdate,
    assignmentController.update,
  );
  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_WRITE),
    assignmentController.remove,
  );

  router.post(
    '/submissions/:submissionId/grade',
    requireAuth,
    requirePermission(PERMISSIONS.ASSIGNMENTS_GRADE),
    validateGrade,
    assignmentController.grade,
  );

  return router;
}

export const assignmentRouter = createAssignmentRouter();
