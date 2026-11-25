import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { lessonController } from './lesson.controller.js';
import { validateLessonUpdate } from './lesson.validation.js';

export function createLessonRouter() {
  const router = Router();

  router.patch(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.LESSONS_WRITE),
    validateLessonUpdate,
    lessonController.update,
  );
  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.LESSONS_WRITE),
    lessonController.remove,
  );
  router.post('/:id/complete', requireAuth, lessonController.complete);
  router.get('/:id/asset', requireAuth, lessonController.asset);

  return router;
}

export const lessonRouter = createLessonRouter();
