import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

export const issueCertificateSchema = z.object({
  courseId: z.string().trim().min(1).max(64),
});

export const issueCertificateForUserSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  courseId: z.string().trim().min(1).max(64),
});

export const revokeCertificateSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export const validateIssueCertificate = validate({ body: issueCertificateSchema });
export const validateIssueCertificateForUser = validate({ body: issueCertificateForUserSchema });
export const validateRevokeCertificate = validate({ body: revokeCertificateSchema });
