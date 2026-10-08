import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { sendSuccess, sendError, getParam } from '../../utils/response';
import { Role } from '@prisma/client';

export class AttendanceController {
  static async mark(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, date, status, remarks } = req.body;
      if (!employeeId || !date || !status) {
        return sendError(res, 'employeeId, date, and status are required.', [], 422);
      }
      const data = await AttendanceService.markAttendance({ employeeId, date, status, remarks });
      return sendSuccess(res, 'Attendance marked successfully.', data);
    } catch (e) { return next(e); }
  }

  static async getMonthlySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
      const departmentId = req.query.departmentId as string;

      const data = await AttendanceService.getMonthlySummary(month, year, departmentId);
      return sendSuccess(res, 'Monthly attendance summary retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getEmployeeAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const targetEmpId = getParam(req.params.employeeId);
      if (req.user?.role === Role.EMPLOYEE && req.user.employeeId !== targetEmpId) {
        return sendError(res, 'Forbidden: You can only view your own attendance.', [], 403);
      }

      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const data = await AttendanceService.getEmployeeAttendance(targetEmpId, month, year);
      return sendSuccess(res, 'Employee attendance history retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getMyAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendError(res, 'No employee record linked with current user.', [], 404);
      }
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const data = await AttendanceService.getEmployeeAttendance(req.user.employeeId, month, year);
      return sendSuccess(res, 'Your attendance history retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async importBulk(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'Please upload an Excel file (.xlsx or .xls).', [], 400);
      }

      const result = await AttendanceService.importBulkAttendance(req.file.buffer || fsToBuffer(req.file.path));
      return sendSuccess(res, 'Attendance import completed.', result);
    } catch (e) { return next(e); }
  }
}

function fsToBuffer(filePath: string): Buffer {
  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);
  return buffer;
}
