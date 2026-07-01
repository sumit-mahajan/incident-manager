import type { RequestHandler } from 'express';
import type { UserRepository } from '../domain/ports';
import { UnauthenticatedError } from '../domain/errors';

export function resolveCurrentUser(repo: UserRepository): RequestHandler {
  return async (req, _res, next): Promise<void> => {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') {
      next(new UnauthenticatedError('X-User-Id header is required'));
      return;
    }
    try {
      const user = await repo.findById(userId);
      if (!user) {
        next(new UnauthenticatedError('Unknown user'));
        return;
      }
      req.currentUser = { userId: user.userId, name: user.name, email: user.email };
      next();
    } catch (err) {
      next(err);
    }
  };
}
