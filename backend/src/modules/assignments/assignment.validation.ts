import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

export const assignmentCreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(10000),
  dueAt: z.string().datetime().optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
});

export const assignmentUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(10).max(10000).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    maxScore: z.number().int().min(1).max(1000).optional(),
    status: z.enum(['draft', 'published']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const submissionSchema = z.object({
  content: z.string().trim().max(20000).optional(),
});

export const gradeSchema = z.object({
  grade: z.number().min(0).max(1000),
  feedback: z.string().trim().max(5000).optional(),
});

export const validateAssignmentCreate = validate({ body: assignmentCreateSchema });
export const validateAssignmentUpdate = validate({ body: assignmentUpdateSchema });
export const validateSubmission = validate({ body: submissionSchema });
export const validateGrade = validate({ body: gradeSchema });
