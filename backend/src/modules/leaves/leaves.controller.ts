import { Request, Response, NextFunction } from 'express';
import { LeavesService } from './leaves.service';
import { sendSuccess, sendError, getParam } from '../../utils/response';
import { Role } from '@prisma/client';

export class LeavesController {
  static async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const { leaveTypeId, fromDate, toDate, reason, employeeId } = req.body;

      let targetEmpId = employeeId;
      if (req.user?.role === Role.EMPLOYEE) {
        if (!req.user.employeeId) {
          return sendError(res, 'No employee record linked with current user.', [], 404);
        }
        targetEmpId = req.user.employeeId;
      }

      if (!targetEmpId || !leaveTypeId || !fromDate || !toDate) {
        return sendError(res, 'Missing required leave fields.', [], 422);
      }

      const result = await LeavesService.applyLeave({
        employeeId: targetEmpId,
        leaveTypeId,
        fromDate,
        toDate,
        reason: reason || 'Personal Leave',
      });

      return sendSuccess(res, 'Leave applied successfully.', result, 201);
    } catch (e) { return next(e); }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, rejectionReason } = req.body;
      if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
        return sendError(res, 'Invalid status update.', [], 400);
      }

      const requestId = getParam(req.params.id);
      const result = await LeavesService.updateStatus(
        requestId,
        status,
        req.user?.email || 'admin',
        rejectionReason
      );

      return sendSuccess(res, `Leave request ${status.toLowerCase()} successfully.`, result);
    } catch (e) { return next(e); }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthenticated', [], 401);
      const requestId = getParam(req.params.id);
      const result = await LeavesService.cancelRequest(requestId, req.user);
      return sendSuccess(res, 'Leave request cancelled successfully.', result);
    } catch (e) { return next(e); }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const params: any = { ...req.query };
      if (req.user?.role === Role.EMPLOYEE) {
        params.employeeId = req.user.employeeId;
      }

      const data = await LeavesService.listRequests(params);
      return sendSuccess(res, 'Leave requests retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getBalances(req: Request, res: Response, next: NextFunction) {
    try {
      let targetEmpId = getParam(req.params.employeeId);
      if (req.user?.role === Role.EMPLOYEE) {
        targetEmpId = req.user.employeeId!;
      }
      if (!targetEmpId) return sendError(res, 'Employee ID required.', [], 400);

      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const data = await LeavesService.getBalances(targetEmpId, year);
      return sendSuccess(res, 'Leave balances retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getMyBalances(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) return sendError(res, 'No linked employee record.', [], 404);
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const data = await LeavesService.getBalances(req.user.employeeId, year);
      return sendSuccess(res, 'Your leave balances retrieved.', data);
    } catch (e) { return next(e); }
  }
}
