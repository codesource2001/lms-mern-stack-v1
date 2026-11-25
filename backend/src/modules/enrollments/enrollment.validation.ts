import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

export const enrollSchema = z.object({
  courseId: z.string().trim().min(1),
});

export const validateEnroll = validate({ body: enrollSchema });
