import type { RequestHandler } from 'express';

import { sendSuccess } from '../../shared/http/response.js';
import { analyticsService } from './analytics.service.js';

export function createAnalyticsController() {
  const overview: RequestHandler = async (req, res) => {
    const result = await analyticsService.getOverview({
      userId: req.auth!.userId,
      roles: req.auth!.roles,
    });

    sendSuccess(res, { message: 'Analytics overview', data: { overview: result } });
  };

  return { overview };
}

export const analyticsController = createAnalyticsController();
