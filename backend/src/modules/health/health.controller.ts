import type { RequestHandler } from 'express';

import { env } from '../../config/env.js';
import type { ReadinessReport } from '../../infrastructure/types.js';
import type { ErrorPayload } from '../../shared/http/response.js';
import { sendSuccess } from '../../shared/http/response.js';
import { HTTP_STATUS } from '../../shared/http/status.js';

export const getHealth: RequestHandler = (_req, res) => {
  sendSuccess(res, {
    message: 'Service is healthy',
    data: {
      status: 'ok',
      service: 'atrium-api',
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString(),
    },
  });
};

export function createReadinessHandler(
  readinessCheck: () => Promise<ReadinessReport>,
): RequestHandler {
  return async (req, res) => {
    const report = await readinessCheck();

    if (report.status === 'ready') {
      sendSuccess(res, {
        message: 'Service is ready',
        data: {
          status: 'ready',
          checkedAt: report.checkedAt,
          checks: report.checks,
        },
      });
      return;
    }

    const payload: ErrorPayload = {
      success: false,
      message: 'Service is not ready',
      code: 'SERVICE_UNAVAILABLE',
      requestId: req.id,
      context: {
        checkedAt: report.checkedAt,
        checks: report.checks,
      },
    };

    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(payload);
  };
}
