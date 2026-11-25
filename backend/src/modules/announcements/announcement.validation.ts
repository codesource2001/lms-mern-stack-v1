import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

export const createAnnouncementSchema = z.object({
  courseId: z.string().trim().min(1).max(64),
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().min(1).max(10_000),
});

export const courseIdParamsSchema = z.object({
  courseId: z.string().trim().min(1).max(64),
});

export const announcementIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const announcementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const validateCreateAnnouncement = validate({ body: createAnnouncementSchema });
export const validateCourseIdParams = validate({ params: courseIdParamsSchema });
export const validateAnnouncementIdParams = validate({ params: announcementIdParamsSchema });
export const validateAnnouncementListQuery = validate({ query: announcementListQuerySchema });
