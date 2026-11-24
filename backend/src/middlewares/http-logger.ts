import type { Request } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from '../config/logger.js';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).id,
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) {
      return 'error';
    }

    if (res.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },
});
