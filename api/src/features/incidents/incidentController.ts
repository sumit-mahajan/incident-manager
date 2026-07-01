import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { IncidentService } from './incidentService';
import {
  CreateIncidentSchema,
  UpdateIncidentFieldsSchema,
  UpdateStatusSchema,
  UpdateAssigneeSchema,
  SuggestSchema,
  IntakeSchema,
  CreateCommentSchema,
  ListIncidentsQuerySchema,
} from './schemas';
import { ValidationError } from '../../domain/errors';
import type { Status } from '../../domain/types';

function zodToValidation(err: ZodError): ValidationError {
  return new ValidationError('Invalid input', err.flatten().fieldErrors as Record<string, unknown>);
}

export class IncidentController {
  constructor(private service: IncidentService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = CreateIncidentSchema.parse(req.body);
      const incident = await this.service.create(req.currentUser, body);
      res.status(201).json(incident);
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = ListIncidentsQuerySchema.parse(req.query);
      const result = await this.service.findMany(
        {
          severity: query.severity,
          status: query.status,
          groupId: query.group,
          q: query.q,
        },
        { page: query.page, limit: query.limit }
      );
      res.json(result);
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incident = await this.service.findById(req.params.id);
      res.json(incident);
    } catch (err) {
      next(err);
    }
  };

  updateFields = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = UpdateIncidentFieldsSchema.parse(req.body);
      const incident = await this.service.updateFields(req.currentUser, req.params.id, body);
      res.json(incident);
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = UpdateStatusSchema.parse(req.body);
      const incident = await this.service.updateStatus(req.currentUser, req.params.id, status as Status);
      res.json(incident);
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  updateAssignee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { assigneeId } = UpdateAssigneeSchema.parse(req.body);
      const incident = await this.service.updateAssignee(req.currentUser, req.params.id, assigneeId);
      res.json(incident);
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  suggest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { description } = SuggestSchema.parse(req.body);
      const suggestion = await this.service.suggestSeverityAndRouting(description);
      res.json(suggestion);
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  generateSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.generateSummary(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  generateRootCause = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.generateRootCause(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  intake = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { text } = IntakeSchema.parse(req.body);
      const parsed = await this.service.parseIntake(text);
      res.json({ parsed });
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  createComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { body } = CreateCommentSchema.parse(req.body);
      const comment = await this.service.addComment(req.currentUser, req.params.id, body);
      res.status(201).json(comment);
    } catch (err) {
      next(err instanceof ZodError ? zodToValidation(err) : err);
    }
  };

  listComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comments = await this.service.listComments(req.params.id);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  };
}
