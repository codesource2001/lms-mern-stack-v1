import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { env } from '../config/env.js';
import type { ErrorPayload } from '../shared/http/response.js';
import { HTTP_STATUS } from '../shared/http/status.js';

export function endpointRateLimit(
  limit: number,
  windowMs = env.RATE_LIMIT_WINDOW_MS,
): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      const payload: ErrorPayload = {
        success: false,
        message: 'Too many requests. Please retry later.',
        code: 'RATE_LIMITED',
        requestId: req.id,
      };

      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(payload);
    },
  });
}

/** Unauthenticated public lookups and expensive reports need tighter limits. */
export const publicReadLimiter = endpointRateLimit(60, 15 * 60_000);
export const analyticsLimiter = endpointRateLimit(60);
export const mutatingLimiter = endpointRateLimit(40);
export const uploadLimiter = endpointRateLimit(20);
