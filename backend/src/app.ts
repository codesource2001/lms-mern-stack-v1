import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './config/env.js';
import { createDocsRouter } from './docs/docs.routes.js';
import { checkReadiness } from './infrastructure/readiness.js';
import type { ReadinessReport } from './infrastructure/types.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { httpLogger } from './middlewares/http-logger.js';
import { requestId } from './middlewares/request-id.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { AuthService } from './modules/auth/auth.service.js';
import { createApiRouter } from './routes/index.js';
import type { ErrorPayload } from './shared/http/response.js';
import { HTTP_STATUS } from './shared/http/status.js';

export interface AppOptions {
  enableDocs?: boolean;
  readinessCheck?: () => Promise<ReadinessReport>;
  authService?: AuthService;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const enableDocs = options.enableDocs ?? env.ENABLE_API_DOCS;
  const readinessCheck = options.readinessCheck ?? checkReadiness;

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS > 0 ? env.TRUST_PROXY_HOPS : false);

  app.use(requestId);
  app.use(httpLogger);

  /*
   * Swagger UI relies on inline bootstrap code. The relaxed policy exists only
   * while the non-production documentation routes are enabled; production
   * documentation and the final SPA CSP are deployment-phase concerns.
   */
  app.use(
    enableDocs
      ? helmet({
          contentSecurityPolicy: {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              'script-src': ["'self'", "'unsafe-inline'"],
              'style-src': ["'self'", "'unsafe-inline'"],
            },
          },
        })
      : helmet(),
  );

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
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (req) =>
        req.method === 'OPTIONS' ||
        req.path === '/health' ||
        req.path === '/health/ready' ||
        req.path.startsWith('/api-docs'),
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

  app.use('/health', createHealthRouter(readinessCheck));
  const apiRouterOptions =
    options.authService === undefined ? {} : { authService: options.authService };
  app.use(env.API_PREFIX, createApiRouter(apiRouterOptions));

  if (enableDocs) {
    app.use('/api-docs', createDocsRouter());
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
