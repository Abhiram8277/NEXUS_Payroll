import { Request, Response, NextFunction } from 'express';
import { PayslipsService } from './payslips.service';
import { sendSuccess, sendError, getParam } from '../../utils/response';
import { Role } from '@prisma/client';

export class PayslipsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      let targetEmpId = req.query.employeeId as string;
      if (req.user?.role === Role.EMPLOYEE) {
        targetEmpId = req.user.employeeId!;
      }

      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const data = await PayslipsService.listPayslips(targetEmpId, month, year);
      return sendSuccess(res, 'Payslips retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const payslipId = getParam(req.params.id);
      const payslip = await PayslipsService.getPayslipById(payslipId);

      if (req.user?.role === Role.EMPLOYEE && req.user.employeeId !== payslip.employeeId) {
        return sendError(res, 'Forbidden: You can only access your own payslip.', [], 403);
      }

      return sendSuccess(res, 'Payslip details retrieved.', payslip);
    } catch (e) { return next(e); }
  }

  static async downloadPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const payslipId = getParam(req.params.id);
      const payslip = await PayslipsService.getPayslipById(payslipId);

      if (req.user?.role === Role.EMPLOYEE && req.user.employeeId !== payslip.employeeId) {
        return sendError(res, 'Forbidden: You can only download your own payslip.', [], 403);
      }

      const { buffer, fileName } = await PayslipsService.generatePDF(payslipId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(buffer);
    } catch (e) { return next(e); }
  }
}
