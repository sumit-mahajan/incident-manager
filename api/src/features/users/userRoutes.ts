import { Router } from 'express';
import type { UserRepository } from '../../domain/ports';
import { UserController } from './userController';

export function userRoutes(repo: UserRepository): Router {
  const router = Router();
  const ctrl = new UserController(repo);

  router.get('/', ctrl.list);
  router.get('/:id/groups', ctrl.getGroups);

  return router;
}
