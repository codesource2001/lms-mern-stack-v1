import { z } from 'zod';

import { paginationQuerySchema } from './pagination.js';
import { createSortSchema } from './sorting.js';

export interface ListQueryOptions<
  TSortField extends string,
  TFilterShape extends Record<string, z.ZodType>,
> {
  sortFields: readonly [TSortField, ...TSortField[]];
  defaultSort: TSortField;
  defaultSortDirection?: 'asc' | 'desc';
  filters: TFilterShape;
}

/**
 * Composes pagination, allowlisted sorting, and a strict filter shape into one
 * query schema. Unknown query parameters are a validation error, never an
 * implicit filter.
 */
export function createListQuerySchema<
  TSortField extends string,
  TFilterShape extends Record<string, z.ZodType>,
>(options: ListQueryOptions<TSortField, TFilterShape>) {
  return z.strictObject({
    ...paginationQuerySchema.shape,
    sort: createSortSchema(options.sortFields, options.defaultSort, options.defaultSortDirection),
    ...options.filters,
  });
}
