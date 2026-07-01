import type { Request, Response, NextFunction } from 'express';
import type { GroupRepository } from '../../domain/ports';

export class GroupController {
  constructor(private groupRepo: GroupRepository) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const groupList = await this.groupRepo.findAll();
      res.json(groupList);
    } catch (err) {
      next(err);
    }
  };
}
