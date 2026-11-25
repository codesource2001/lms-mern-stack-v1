import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';
import { createListQuerySchema } from '../../shared/query/list-query.js';
import { identifierSchema, searchTermSchema } from '../../shared/query/filtering.js';

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  parentId: z.string().trim().optional(),
});

export const courseCreateSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(10000),
  shortDescription: z.string().trim().max(300).optional(),
  categoryId: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  prerequisiteIds: z.array(identifierSchema).optional(),
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
});

export const courseUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().min(10).max(10000).optional(),
    shortDescription: z.string().trim().max(300).nullable().optional(),
    categoryId: z.string().trim().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    prerequisiteIds: z.array(identifierSchema).optional(),
    priceCents: z.number().int().min(0).max(10_000_000).optional(),
    currency: z.string().trim().length(3).optional(),
    status: z.enum(['draft', 'submitted', 'published', 'archived']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const courseListQuerySchema = createListQuerySchema({
  sortFields: ['createdAt', 'title'] as const,
  defaultSort: 'createdAt',
  defaultSortDirection: 'desc',
  filters: {
    q: searchTermSchema.optional(),
    category: identifierSchema.optional(),
    tag: z.string().trim().max(40).optional(),
    free: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  },
});

export const sectionSchema = z.object({
  title: z.string().trim().min(2).max(150),
});

export const validateCategory = validate({ body: categorySchema });
export const validateCourseCreate = validate({ body: courseCreateSchema });
export const validateCourseUpdate = validate({ body: courseUpdateSchema });
export const validateCourseList = validate({ query: courseListQuerySchema });
export const validateSection = validate({ body: sectionSchema });
