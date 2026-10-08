import { Request, Response, NextFunction } from 'express';
import { SalaryService } from './salary.service';
import { sendSuccess, sendError, getParam } from '../../utils/response';
import { Role } from '@prisma/client';

export class SalaryController {
  // Templates
  static async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SalaryService.listTemplates();
      return sendSuccess(res, 'Salary templates retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SalaryService.getTemplate(getParam(req.params.id));
      return sendSuccess(res, 'Salary template retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SalaryService.createTemplate(req.body);
      return sendSuccess(res, 'Salary template created.', data, 201);
    } catch (e) { return next(e); }
  }

  static async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SalaryService.updateTemplate(getParam(req.params.id), req.body);
      return sendSuccess(res, 'Salary template updated.', data);
    } catch (e) { return next(e); }
  }

  // Employee Salary Assignment
  static async assignSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SalaryService.assignSalary(req.body);
      return sendSuccess(res, 'Salary assigned to employee successfully.', data);
    } catch (e) { return next(e); }
  }

  static async getEmployeeSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const targetEmpId = getParam(req.params.employeeId);

      // Ownership protection for Employee role
      if (req.user?.role === Role.EMPLOYEE && req.user.employeeId !== targetEmpId) {
        return sendError(res, 'Forbidden: You cannot access salary details of other employees.', [], 403);
      }

      const data = await SalaryService.getEmployeeSalary(targetEmpId);
      return sendSuccess(res, 'Employee salary details retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getMySalary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendError(res, 'No employee record linked with current user.', [], 404);
      }
      const data = await SalaryService.getEmployeeSalary(req.user.employeeId);
      return sendSuccess(res, 'Your salary structure retrieved.', data);
    } catch (e) { return next(e); }
  }
}
