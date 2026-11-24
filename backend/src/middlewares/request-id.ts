import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const incomingId = req.get('x-request-id');
  req.id = incomingId && REQUEST_ID_PATTERN.test(incomingId) ? incomingId : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
