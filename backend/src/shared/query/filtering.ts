import { z } from 'zod';

export const MAX_SEARCH_TERM_LENGTH = 100;

/**
 * Bounded free-text input for list filters. Repositories must escape the term
 * with `escapeRegExp` before using it in a MongoDB regex.
 */
export const searchTermSchema = z
  .string()
  .trim()
  .min(2, 'search must be at least 2 characters')
  .max(MAX_SEARCH_TERM_LENGTH, `search must be at most ${MAX_SEARCH_TERM_LENGTH} characters`);

/** A 24-character hexadecimal MongoDB ObjectId supplied by a client. */
export const identifierSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{24}$/i, 'must be a valid identifier');

/**
 * Builds a strict filter schema: unknown query keys are rejected instead of
 * silently ignored, so typos cannot broaden a query unexpectedly.
 */
export function createFilterSchema<TShape extends Record<string, z.ZodType>>(shape: TShape) {
  return z.strictObject(shape);
}

/**
 * Escapes a user-supplied search term for safe use inside a regular expression.
 * Combined with `searchTermSchema`'s length cap this prevents regex injection
 * and catastrophic backtracking from unbounded input.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
