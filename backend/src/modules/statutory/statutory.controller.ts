import { Request, Response, NextFunction } from 'express';
import { StatutoryService } from './statutory.service';
import { sendSuccess } from '../../utils/response';

export class StatutoryController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StatutoryService.getAll();
      return sendSuccess(res, 'Statutory configurations retrieved.', data);
    } catch (e) {
      return next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StatutoryService.createOrUpdate({
        ...req.body,
        createdBy: req.user?.email || 'admin',
      });
      return sendSuccess(res, 'Statutory configuration updated successfully.', data, 201);
    } catch (e) {
      return next(e);
    }
  }
}
