import { Request, Response, NextFunction } from 'express';
import { CompanyService } from './company.service';
import { sendSuccess } from '../../utils/response';

export class CompanyController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await CompanyService.getCompany();
      return sendSuccess(res, 'Company details retrieved.', company);
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await CompanyService.updateCompany(req.body);
      return sendSuccess(res, 'Company profile updated successfully.', updated);
    } catch (error) {
      return next(error);
    }
  }
}
