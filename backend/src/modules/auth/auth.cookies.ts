import type { CookieOptions, Response } from 'express';

import { env } from '../../config/env.js';

const refreshCookiePath = `${env.API_PREFIX}/auth`;

export function refreshCookieOptions(maxAgeMs?: number): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: 'lax',
    path: refreshCookiePath,
  };

  if (maxAgeMs !== undefined) {
    options.maxAge = maxAgeMs;
  }

  return options;
}

export function setRefreshCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(env.AUTH_COOKIE_NAME, token, refreshCookieOptions(maxAgeMs));
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.AUTH_COOKIE_NAME, refreshCookieOptions());
}
