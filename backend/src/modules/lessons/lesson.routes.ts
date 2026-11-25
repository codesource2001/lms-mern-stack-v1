import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { lessonController } from './lesson.controller.js';
import { validateLessonUpdate } from './lesson.validation.js';
import { mutatingLimiter } from '../../middlewares/endpoint-rate-limit.js';
import { validateIdParam } from '../../middlewares/validate-id.js';

export function createLessonRouter() {
  const router = Router();

  router.patch(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.LESSONS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    validateLessonUpdate,
    lessonController.update,
  );
  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.LESSONS_WRITE),
    mutatingLimiter,
    validateIdParam('id'),
    lessonController.remove,
  );
  router.post(
    '/:id/complete',
    requireAuth,
    mutatingLimiter,
    validateIdParam('id'),
    lessonController.complete,
  );
  router.get('/:id/asset', requireAuth, validateIdParam('id'), lessonController.asset);

  return router;
}

export const lessonRouter = createLessonRouter();
