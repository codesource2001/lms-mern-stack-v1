import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { httpLogger } from './middlewares/http-logger.js';
import { requestId } from './middlewares/request-id.js';
import { healthRouter } from './modules/health/health.routes.js';
import { apiRouter } from './routes/index.js';
import type { ErrorPayload } from './shared/http/response.js';
import { HTTP_STATUS } from './shared/http/status.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS > 0 ? env.TRUST_PROXY_HOPS : false);

  app.use(requestId);
  app.use(httpLogger);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb', strict: true }));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
      handler: (req, res) => {
        const payload: ErrorPayload = {
          success: false,
          message: 'Too many requests. Please retry later.',
          code: 'RATE_LIMITED',
          requestId: req.id,
        };

        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(payload);
      },
    }),
  );

  app.use('/health', healthRouter);
  app.use(env.API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
