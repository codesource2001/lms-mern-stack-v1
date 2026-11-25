import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

export const notificationIdSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const notificationQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const channelSchema = z
  .object({
    inApp: z.boolean().optional(),
    email: z.boolean().optional(),
  })
  .strict();

export const preferenceSchema = z
  .object({
    announcements: channelSchema.optional(),
    deadlines: channelSchema.optional(),
    grades: channelSchema.optional(),
    system: channelSchema.optional(),
  })
  .strict();

export const validateNotificationQuery = validate({ query: notificationQuerySchema });
export const validateNotificationId = validate({ params: notificationIdSchema });
export const validatePreferences = validate({ body: preferenceSchema });
