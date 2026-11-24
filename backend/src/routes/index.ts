import { Router } from 'express';

import { env } from '../config/env.js';
import { sendSuccess } from '../shared/http/response.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  sendSuccess(res, {
    message: 'Atrium API is running',
    data: {
      name: 'Atrium LMS API',
      version: env.APP_VERSION,
      apiVersion: 'v1',
    },
  });
});
