import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { IncidentService } from './incidentService';
import { IncidentController } from './incidentController';

export function incidentRoutes(service: IncidentService, auth: RequestHandler): Router {
  const router = Router();
  const ctrl = new IncidentController(service);

  router.get('/', ctrl.list);
  router.post('/', auth, ctrl.create);
  router.post('/suggest', auth, ctrl.suggest);
  router.post('/intake', auth, ctrl.intake);
  router.get('/:id', ctrl.getById);
  router.patch('/:id', auth, ctrl.updateFields);
  router.patch('/:id/status', auth, ctrl.updateStatus);
  router.patch('/:id/assignee', auth, ctrl.updateAssignee);
  router.post('/:id/summary', auth, ctrl.generateSummary);
  router.post('/:id/root-cause', auth, ctrl.generateRootCause);

  return router;
}
