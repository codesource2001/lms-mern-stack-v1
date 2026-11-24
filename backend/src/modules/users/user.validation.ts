import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';
import { createListQuerySchema } from '../../shared/query/list-query.js';
import { identifierSchema, searchTermSchema } from '../../shared/query/filtering.js';

const statusSchema = z.enum(['pending_verification', 'active', 'suspended']);
const applicationStatusSchema = z.enum(['none', 'pending', 'approved', 'rejected']);

export const userListQuerySchema = createListQuerySchema({
  sortFields: ['createdAt', 'name', 'email', 'status'] as const,
  defaultSort: 'createdAt',
  defaultSortDirection: 'desc',
  filters: {
    status: statusSchema.optional(),
    role: identifierSchema.optional(),
    applicationStatus: applicationStatusSchema.optional(),
    q: searchTermSchema.optional(),
    includeDeleted: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  },
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
    status: statusSchema.optional(),
    roleIds: z.array(identifierSchema).min(1).optional(),
    instructorApplicationStatus: applicationStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const instructorApplicationSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export const validateUserList = validate({ query: userListQuerySchema });
export const validateUserUpdate = validate({ body: updateUserSchema });
export const validateInstructorApplication = validate({ body: instructorApplicationSchema });
