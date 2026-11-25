import { Router } from 'express';

import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { PERMISSIONS } from '../rbac/rbac.catalog.js';
import { certificateController } from './certificate.controller.js';
import {
  validateIssueCertificate,
  validateIssueCertificateForUser,
  validateRevokeCertificate,
} from './certificate.validation.js';

export function createCertificateRouter() {
  const router = Router();

  router.get('/verify/:certificateId', certificateController.verify);

  router.post(
    '/',
    requireAuth,
    requirePermission(PERMISSIONS.CERTIFICATES_READ),
    validateIssueCertificate,
    certificateController.issue,
  );
  router.post(
    '/issue',
    requireAuth,
    requirePermission(PERMISSIONS.CERTIFICATES_ISSUE),
    validateIssueCertificateForUser,
    certificateController.issueForUser,
  );
  router.get(
    '/mine',
    requireAuth,
    requirePermission(PERMISSIONS.CERTIFICATES_READ),
    certificateController.mine,
  );
  router.post(
    '/:certificateId/revoke',
    requireAuth,
    requirePermission(PERMISSIONS.CERTIFICATES_ISSUE),
    validateRevokeCertificate,
    certificateController.revoke,
  );
  router.get(
    '/:certificateId/pdf',
    requireAuth,
    requirePermission(PERMISSIONS.CERTIFICATES_READ),
    certificateController.pdf,
  );

  return router;
}

export const certificateRouter = createCertificateRouter();
