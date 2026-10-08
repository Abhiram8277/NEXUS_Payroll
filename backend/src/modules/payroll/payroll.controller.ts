import { Request, Response, NextFunction } from 'express';
import { PayrollService } from './payroll.service';
import { sendSuccess, sendError, getParam } from '../../utils/response';

export class PayrollController {
  static async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const month = parseInt(req.query.month as string, 10);
      const year = parseInt(req.query.year as string, 10);
      if (!month || !year) {
        return sendError(res, 'Month (1-12) and Year are required query parameters.', [], 422);
      }

      const previewData = await PayrollService.calculateRun(
        month,
        year,
        req.user?.email || 'admin',
        true
      );
      return sendSuccess(res, 'Payroll preview calculated.', previewData);
    } catch (e) { return next(e); }
  }

  static async run(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        return sendError(res, 'Month (1-12) and Year are required.', [], 422);
      }

      const result = await PayrollService.calculateRun(
        Number(month),
        Number(year),
        req.user?.email || 'admin',
        false
      );
      return sendSuccess(res, `Payroll calculated for ${month}/${year}.`, result);
    } catch (e) { return next(e); }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const runs = await PayrollService.listRuns();
      return sendSuccess(res, 'Payroll runs retrieved.', runs);
    } catch (e) { return next(e); }
  }

  static async getByPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const month = parseInt(getParam(req.params.month), 10);
      const year = parseInt(getParam(req.params.year), 10);
      const run = await PayrollService.getRun(month, year);
      if (!run) return sendError(res, 'No payroll record found for this period.', [], 404);
      return sendSuccess(res, 'Payroll run retrieved.', run);
    } catch (e) { return next(e); }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const runId = getParam(req.params.id);
      const run = await PayrollService.approveRun(runId, req.user?.email || 'admin');
      return sendSuccess(res, 'Payroll run successfully approved by Admin.', run);
    } catch (e) { return next(e); }
  }

  static async lock(req: Request, res: Response, next: NextFunction) {
    try {
      const runId = getParam(req.params.id);
      const run = await PayrollService.lockRun(runId, req.user?.email || 'admin');
      return sendSuccess(res, 'Payroll locked and payslips generated successfully.', run);
    } catch (e) { return next(e); }
  }
}
