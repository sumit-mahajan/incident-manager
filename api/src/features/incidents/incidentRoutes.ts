import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { IncidentService } from './incidentService';
import { IncidentController } from './incidentController';

export function incidentRoutes(service: IncidentService, auth: RequestHandler): Router {
  const router = Router();
  const ctrl = new IncidentController(service);

  router.get('/', ctrl.list);
  router.post('/', auth, ctrl.create);
  router.get('/:id', ctrl.getById);
  router.patch('/:id', auth, ctrl.updateFields);
  router.patch('/:id/status', auth, ctrl.updateStatus);
  router.patch('/:id/assignee', auth, ctrl.updateAssignee);

  return router;
}
