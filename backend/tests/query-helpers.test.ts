import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createFilterSchema,
  escapeRegExp,
  identifierSchema,
  searchTermSchema,
} from '../src/shared/query/filtering.js';
import { createListQuerySchema } from '../src/shared/query/list-query.js';
import {
  buildPaginationMeta,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginationQuerySchema,
  toOffset,
} from '../src/shared/query/pagination.js';
import { createSortSchema } from '../src/shared/query/sorting.js';

describe('pagination', () => {
  it('applies bounded defaults', () => {
    expect(paginationQuerySchema.parse({})).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it('rejects invalid pages and a page size above the maximum', () => {
    expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: MAX_PAGE_SIZE + 1 }).success).toBe(false);
  });

  it('computes offsets and complete pagination metadata', () => {
    const query = paginationQuerySchema.parse({ page: 3, limit: 10 });

    expect(toOffset(query)).toBe(20);
    expect(buildPaginationMeta(query, 45)).toEqual({
      page: 3,
      limit: 10,
      total: 45,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(buildPaginationMeta(query, 0)).toMatchObject({
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});

describe('sorting', () => {
  const sortSchema = createSortSchema(['createdAt', 'title'] as const, 'createdAt', 'desc');

  it('applies the allowlisted default sort', () => {
    expect(sortSchema.parse(undefined)).toEqual({ field: 'createdAt', direction: -1 });
  });

  it('accepts an allowlisted ascending field', () => {
    expect(sortSchema.parse('title')).toEqual({ field: 'title', direction: 1 });
  });

  it('rejects fields outside the allowlist and injection-shaped values', () => {
    expect(sortSchema.safeParse('password').success).toBe(false);
    expect(sortSchema.safeParse('title;db.dropDatabase()').success).toBe(false);
  });
});

describe('filtering', () => {
  it('rejects unknown filter keys', () => {
    const filterSchema = createFilterSchema({
      category: identifierSchema.optional(),
      q: searchTermSchema.optional(),
    });

    expect(filterSchema.safeParse({ q: 'algebra' }).success).toBe(true);
    expect(filterSchema.safeParse({ q: 'algebra', role: 'admin' }).success).toBe(false);
  });

  it('bounds search terms', () => {
    expect(searchTermSchema.safeParse(' a ').success).toBe(false);
    expect(searchTermSchema.safeParse('a'.repeat(101)).success).toBe(false);
    expect(searchTermSchema.parse('  algebra  ')).toBe('algebra');
  });

  it('escapes regular-expression metacharacters', () => {
    expect(escapeRegExp('a.*(b)[c]')).toBe('a\\.\\*\\(b\\)\\[c\\]');
  });
});

describe('list query schema', () => {
  const listQuerySchema = createListQuerySchema({
    sortFields: ['createdAt', 'title'] as const,
    defaultSort: 'createdAt',
    defaultSortDirection: 'desc',
    filters: {
      q: searchTermSchema.optional(),
      category: identifierSchema.optional(),
    },
  });

  it('composes pagination, sorting, and filters', () => {
    expect(listQuerySchema.parse({ page: '2', q: ' algebra ', sort: 'title' })).toEqual({
      page: 2,
      limit: DEFAULT_PAGE_SIZE,
      sort: { field: 'title', direction: 1 },
      q: 'algebra',
    });
  });

  it('rejects unknown query keys', () => {
    const result = listQuerySchema.safeParse({ page: '1', includeDeleted: 'true' });

    expect(result.success).toBe(false);
  });

  it('rejects a non-allowlisted sort', () => {
    expect(listQuerySchema.safeParse({ sort: '-password' }).success).toBe(false);
  });

  it('rejects a malformed identifier filter', () => {
    expect(listQuerySchema.safeParse({ category: 'not-an-id' }).success).toBe(false);
    expect(
      z
        .object({
          category: identifierSchema,
        })
        .safeParse({ category: '507f1f77bcf86cd799439011' }).success,
    ).toBe(true);
  });
});
