import { Router } from 'express';

import { env } from '../config/env.js';
import { sendSuccess } from '../shared/http/response.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { authService } from '../modules/auth/auth.service.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import { createUserRouter } from '../modules/users/user.routes.js';

export function createApiRouter(options: { authService?: AuthService } = {}): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    sendSuccess(res, {
      message: 'Atrium API is running',
      data: {
        name: 'Atrium LMS API',
        version: env.APP_VERSION,
        apiVersion: 'v1',
      },
    });
  });

  router.use('/auth', createAuthRouter(options.authService ?? authService));
  router.use('/users', createUserRouter());

  return router;
}

export const apiRouter = createApiRouter();
