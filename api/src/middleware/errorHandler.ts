import type { ErrorRequestHandler } from 'express';
import {
  UnauthenticatedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  IllegalTransitionError,
  AiUnavailableError,
  ParseFailedError,
} from '../domain/errors';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof UnauthenticatedError) {
    res.status(401).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof IllegalTransitionError) {
    res.status(409).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ParseFailedError) {
    res.status(422).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof AiUnavailableError) {
    res.status(503).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error('[INTERNAL_ERROR]', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
};
