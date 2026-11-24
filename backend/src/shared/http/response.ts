import type { Response } from 'express';

import type { FieldError } from '../errors/app-error.js';

export interface SuccessPayload<TData, TMeta = Record<string, unknown>> {
  success: true;
  message: string;
  data: TData;
  meta?: TMeta;
}

export interface ErrorPayload {
  success: false;
  message: string;
  code: string;
  errors?: FieldError[];
  requestId?: string;
}

interface SuccessOptions<TData, TMeta> {
  statusCode?: number;
  message: string;
  data: TData;
  meta?: TMeta;
}

export function sendSuccess<TData, TMeta = Record<string, unknown>>(
  res: Response,
  options: SuccessOptions<TData, TMeta>,
): void {
  const payload: SuccessPayload<TData, TMeta> = {
    success: true,
    message: options.message,
    data: options.data,
  };

  if (options.meta !== undefined) {
    payload.meta = options.meta;
  }

  res.status(options.statusCode ?? 200).json(payload);
}
