import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { announcementController } from './announcement.controller.js';
import {
  validateAnnouncementIdParams,
  validateAnnouncementListQuery,
  validateCourseIdParams,
  validateCreateAnnouncement,
} from './announcement.validation.js';
import { mutatingLimiter } from '../../middlewares/endpoint-rate-limit.js';

export function createAnnouncementRouter() {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    mutatingLimiter,
    validateCreateAnnouncement,
    announcementController.create,
  );
  router.get(
    '/course/:courseId',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_READ),
    validateCourseIdParams,
    validateAnnouncementListQuery,
    announcementController.list,
  );
  router.delete(
    '/:id',
    requireAuth,
    requirePermission(PERMISSIONS.COURSES_WRITE),
    mutatingLimiter,
    validateAnnouncementIdParams,
    announcementController.remove,
  );

  return router;
}

export const announcementRouter = createAnnouncementRouter();
