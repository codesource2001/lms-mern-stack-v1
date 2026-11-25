import { z } from 'zod';

import { validate } from './validate.js';

/**
 * Validates a single route parameter before a controller casts it to a string.
 * Domain routes use this at the boundary so malformed identifiers fail with
 * `422 VALIDATION_ERROR` rather than reaching a repository.
 */
export function validateIdParam(name = 'id') {
  return validate({
    params: z.object({
      [name]: z.string().trim().min(1).max(100),
    }),
  });
}
