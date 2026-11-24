import { z } from 'zod';

export interface SortSpec<TField extends string> {
  field: TField;
  direction: 1 | -1;
}

const SORT_PATTERN = /^-?[A-Za-z][A-Za-z0-9_]*$/;

/**
 * Creates a query schema for a single sort field. Only allowlisted fields are
 * accepted, which prevents arbitrary/index-unfriendly sorts and operator
 * injection through query strings.
 */
export function createSortSchema<TField extends string>(
  allowedFields: readonly [TField, ...TField[]],
  defaultField: TField,
  defaultDirection: 'asc' | 'desc' = 'asc',
) {
  const defaultSort = `${defaultDirection === 'desc' ? '-' : ''}${defaultField}`;

  return z
    .string()
    .trim()
    .regex(SORT_PATTERN, 'sort must be a field name with an optional leading "-"')
    .default(defaultSort)
    .refine(
      (value) => {
        const field = value.startsWith('-') ? value.slice(1) : value;
        return allowedFields.includes(field as TField);
      },
      { message: `sort must be one of: ${allowedFields.join(', ')}` },
    )
    .transform((value): SortSpec<TField> => {
      const isDescending = value.startsWith('-');
      const field = isDescending ? value.slice(1) : value;

      return {
        field: field as TField,
        direction: isDescending ? -1 : 1,
      };
    });
}
