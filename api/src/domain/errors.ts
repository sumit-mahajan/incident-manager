export class UnauthenticatedError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;
  readonly status = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;
  readonly status = 404;
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN' as const;
  readonly status = 403;
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR' as const;
  readonly status = 400;
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class IllegalTransitionError extends Error {
  readonly code = 'ILLEGAL_TRANSITION' as const;
  readonly status = 409;
  constructor(from: string, to: string, reason?: string) {
    super(reason ?? `Cannot transition from ${from} to ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

export class AiUnavailableError extends Error {
  readonly code = 'AI_UNAVAILABLE' as const;
  readonly status = 503;
  constructor(message = 'AI service unavailable') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export class ParseFailedError extends Error {
  readonly code = 'PARSE_FAILED' as const;
  readonly status = 422;
  constructor(message = 'Failed to parse AI response') {
    super(message);
    this.name = 'ParseFailedError';
  }
}
