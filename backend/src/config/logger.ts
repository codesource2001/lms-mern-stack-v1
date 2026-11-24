import { pino } from 'pino';

import { env } from './env.js';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'currentPassword',
  '*.currentPassword',
  'newPassword',
  '*.newPassword',
  'passwordHash',
  '*.passwordHash',
  'token',
  '*.token',
  'tokenHash',
  '*.tokenHash',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'refreshTokenHash',
  '*.refreshTokenHash',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'atrium-api',
    environment: env.NODE_ENV,
    version: env.APP_VERSION,
  },
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});
