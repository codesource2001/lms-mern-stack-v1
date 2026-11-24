import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { logger } from '../config/logger.js';
import { AppError, NotFoundError, type FieldError } from '../shared/errors/app-error.js';
import type { ErrorPayload } from '../shared/http/response.js';
import { HTTP_STATUS } from '../shared/http/status.js';

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: FieldError[];
}

function normalizeBodyParserError(error: unknown): NormalizedError | undefined {
  if (!(error instanceof Error) || !('type' in error)) {
    return undefined;
  }

  const { type } = error as { type?: unknown };

  if (type === 'entity.parse.failed') {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON',
    };
  }

  if (type === 'entity.too.large') {
    return {
      statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body exceeds the allowed size',
    };
  }

  return undefined;
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  let normalized: NormalizedError;

  if (error instanceof AppError) {
    normalized = {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  } else if (error instanceof ZodError) {
    normalized = {
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.issues.map((issue) => ({
        field: issue.path.map(String).join('.') || '_root',
        message: issue.message,
        code: issue.code,
      })),
    };
  } else {
    normalized = normalizeBodyParserError(error) ?? {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  const log = req.log ?? logger;

  if (normalized.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    log.error({ err: error, requestId: req.id }, 'Request failed');
  } else {
    log.warn({ err: error, requestId: req.id }, 'Request rejected');
  }

  const payload: ErrorPayload = {
    success: false,
    message: normalized.message,
    code: normalized.code,
    requestId: req.id,
  };

  if (normalized.details !== undefined) {
    payload.errors = normalized.details;
  }

  res.status(normalized.statusCode).json(payload);
};
