import type { Request, Response, NextFunction } from 'express';
import type { UserRepository } from '../../domain/ports';

export class UserController {
  constructor(private userRepo: UserRepository) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userList = await this.userRepo.findAll();
      res.json(userList);
    } catch (err) {
      next(err);
    }
  };

  getGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const groups = await this.userRepo.findGroupsByUserId(req.params.id);
      res.json(groups);
    } catch (err) {
      next(err);
    }
  };
}
