export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface AppErrorOptions {
  statusCode: number;
  code: string;
  details?: FieldError[];
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: FieldError[];
  readonly context?: Record<string, unknown>;
  readonly isOperational = true;

  constructor(message: string, options: AppErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = options.statusCode;
    this.code = options.code;

    if (options.details !== undefined) {
      this.details = options.details;
    }

    if (options.context !== undefined) {
      this.context = options.context;
    }

    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: FieldError[]) {
    super(message, {
      statusCode: 400,
      code: 'BAD_REQUEST',
      ...(details === undefined ? {} : { details }),
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, { statusCode: 409, code: 'CONFLICT' });
  }
}
