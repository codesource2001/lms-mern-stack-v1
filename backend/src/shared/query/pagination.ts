import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * The only supported pagination inputs. `limit` is hard-capped so no list
 * endpoint can request an unbounded result set.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function toOffset(query: PaginationQuery): number {
  return (query.page - 1) * query.limit;
}

export function buildPaginationMeta(query: PaginationQuery, total: number): PaginationMeta {
  const safeTotal = Math.max(0, Math.trunc(total));
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / query.limit);

  return {
    page: query.page,
    limit: query.limit,
    total: safeTotal,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1 && totalPages > 0,
  };
}
