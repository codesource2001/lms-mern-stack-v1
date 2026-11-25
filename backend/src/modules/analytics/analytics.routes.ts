import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { analyticsController } from './analytics.controller.js';
import { analyticsLimiter } from '../../middlewares/endpoint-rate-limit.js';

export function createAnalyticsRouter() {
  const router = Router();

  router.get(
    '/overview',
    requireAuth,
    requirePermission(PERMISSIONS.ANALYTICS_READ),
    analyticsLimiter,
    analyticsController.overview,
  );

  return router;
}

export const analyticsRouter = createAnalyticsRouter();
