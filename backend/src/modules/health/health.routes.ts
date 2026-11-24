import { Router } from 'express';

import type { ReadinessReport } from '../../infrastructure/types.js';
import { createReadinessHandler, getHealth } from './health.controller.js';

export function createHealthRouter(readinessCheck: () => Promise<ReadinessReport>): Router {
  const router = Router();

  router.get('/', getHealth);
  router.get('/ready', createReadinessHandler(readinessCheck));

  return router;
}
