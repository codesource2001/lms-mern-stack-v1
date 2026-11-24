import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
import { AppError } from '../shared/errors/app-error.js';

const allowedOrigins = new Set(env.CORS_ORIGINS);

function reject(): AppError {
  return new AppError('Request origin is not allowed', {
    statusCode: 403,
    code: 'CSRF_REJECTED',
  });
}

function allowedOrigin(value: string): boolean {
  try {
    return allowedOrigins.has(new URL(value).origin);
  } catch {
    return false;
  }
}

/**
 * Defense in depth for cookie-authenticated mutations. Browsers attach an
 * Origin header to cross-site form/fetch submissions. A missing origin is
 * rejected rather than assumed trustworthy, so curl and server-to-server
 * callers must send one explicitly when using the cookie auth endpoints.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');

  if (origin !== undefined) {
    next(allowedOrigin(origin) ? undefined : reject());
    return;
  }

  const referer = req.get('referer');

  if (referer !== undefined && allowedOrigin(referer)) {
    next();
    return;
  }

  next(reject());
};
