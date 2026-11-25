import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

export const lessonCreateSchema = z.object({
  title: z.string().trim().min(2).max(180),
  type: z.enum(['video', 'text', 'pdf', 'resource']),
  sectionId: z.string().trim().optional(),
  content: z.string().trim().max(100000).optional(),
  assetKey: z.string().trim().max(500).optional(),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  isPreview: z.boolean().optional(),
});

export const lessonUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    type: z.enum(['video', 'text', 'pdf', 'resource']).optional(),
    sectionId: z.string().trim().nullable().optional(),
    content: z.string().trim().max(100000).nullable().optional(),
    assetKey: z.string().trim().max(500).nullable().optional(),
    durationSeconds: z.number().int().min(0).max(86400).nullable().optional(),
    isPreview: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1).max(500),
});

export const validateLessonCreate = validate({ body: lessonCreateSchema });
export const validateLessonUpdate = validate({ body: lessonUpdateSchema });
export const validateReorder = validate({ body: reorderSchema });
export const validateComplete = validate({ body: z.object({}).optional() });
