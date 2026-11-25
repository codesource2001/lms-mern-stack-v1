import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { notificationController } from './notification.controller.js';
import {
  validateNotificationId,
  validateNotificationQuery,
  validatePreferences,
} from './notification.validation.js';
import { analyticsLimiter, mutatingLimiter } from '../../middlewares/endpoint-rate-limit.js';

export function createNotificationRouter() {
  const router = Router();

  router.use(requireAuth, requirePermission(PERMISSIONS.NOTIFICATIONS_READ));

  router.get('/', analyticsLimiter, validateNotificationQuery, notificationController.list);
  router.get('/unread-count', analyticsLimiter, notificationController.unreadCount);
  router.get('/preferences', analyticsLimiter, notificationController.getPreferences);
  router.patch(
    '/preferences',
    mutatingLimiter,
    validatePreferences,
    notificationController.updatePreferences,
  );
  router.post('/read-all', mutatingLimiter, notificationController.markAllRead);
  router.post(
    '/:id/read',
    mutatingLimiter,
    validateNotificationId,
    notificationController.markRead,
  );

  return router;
}

export const notificationRouter = createNotificationRouter();
