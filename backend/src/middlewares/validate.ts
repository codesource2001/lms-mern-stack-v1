import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { AppError, type FieldError } from '../shared/errors/app-error.js';
import { HTTP_STATUS } from '../shared/http/status.js';

export type ValidationSource = 'body' | 'query' | 'params';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export interface ValidatedData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

const SOURCES = ['params', 'query', 'body'] as const;

/**
 * Parses the configured request sources and stores the result on
 * `req.validated`. All failures are reported together with source-qualified
 * field paths (for example `body.email`).
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const validated: ValidatedData = {};
    const issues: FieldError[] = [];

    for (const source of SOURCES) {
      const schema = schemas[source];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[source]);

      if (!result.success) {
        issues.push(
          ...result.error.issues.map((issue) => ({
            field: [source, ...issue.path.map(String)].join('.'),
            message: issue.message,
            code: issue.code,
          })),
        );
        continue;
      }

      validated[source] = result.data;
    }

    if (issues.length > 0) {
      next(
        new AppError('Validation failed', {
          statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          code: 'VALIDATION_ERROR',
          details: issues,
        }),
      );
      return;
    }

    req.validated = validated;
    next();
  };
}

/**
 * Reads a parsed request source. The caller is responsible for using the same
 * schema that was passed to `validate()` for that route.
 */
export function getValidated<T>(req: Request, source: ValidationSource): T {
  const value = req.validated?.[source];

  if (value === undefined) {
    throw new Error(
      `Request ${source} was not validated. Register validate() with a ${source} schema for this route.`,
    );
  }

  return value as T;
}
