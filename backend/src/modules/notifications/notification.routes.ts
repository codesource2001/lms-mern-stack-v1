import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { notificationController } from './notification.controller.js';
import {
  validateNotificationId,
  validateNotificationQuery,
  validatePreferences,
} from './notification.validation.js';

export function createNotificationRouter() {
  const router = Router();

  router.use(requireAuth, requirePermission(PERMISSIONS.NOTIFICATIONS_READ));

  router.get('/', validateNotificationQuery, notificationController.list);
  router.get('/unread-count', notificationController.unreadCount);
  router.get('/preferences', notificationController.getPreferences);
  router.patch('/preferences', validatePreferences, notificationController.updatePreferences);
  router.post('/read-all', notificationController.markAllRead);
  router.post('/:id/read', validateNotificationId, notificationController.markRead);

  return router;
}

export const notificationRouter = createNotificationRouter();
