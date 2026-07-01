import { Router } from 'express';
import type { GroupRepository } from '../../domain/ports';
import { GroupController } from './groupController';

export function groupRoutes(repo: GroupRepository): Router {
  const router = Router();
  const ctrl = new GroupController(repo);

  router.get('/', ctrl.list);

  return router;
}
