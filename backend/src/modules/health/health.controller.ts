import type { RequestHandler } from 'express';

import { env } from '../../config/env.js';
import { sendSuccess } from '../../shared/http/response.js';

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
