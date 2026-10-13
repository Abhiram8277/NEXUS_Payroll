import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { EmployeesService } from './employees.service';
import { sendSuccess, sendError, getParam } from '../../utils/response';
import { createEmployeeSchema, updateEmployeeSchema } from './employees.validation';
import { config } from '../../config';
import { Role } from '@prisma/client';

export class EmployeesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmployeesService.listEmployees(req.query as any);
      return sendSuccess(res, 'Employees retrieved successfully.', result);
    } catch (e) {
      return next(e);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const targetId = getParam(req.params.id);

      if (req.user?.role === Role.EMPLOYEE) {
        if (req.user.employeeId !== targetId && req.user.empCode !== targetId) {
          return sendError(res, 'Forbidden: You can only view your own employee profile.', [], 403);
        }
      }

      const employee = await EmployeesService.getEmployeeById(targetId);
      return sendSuccess(res, 'Employee retrieved.', employee);
    } catch (e) {
      return next(e);
    }
  }

  static async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendError(res, 'No employee record associated with this user account.', [], 404);
      }
      const employee = await EmployeesService.getEmployeeById(req.user.employeeId);
      return sendSuccess(res, 'Profile retrieved.', employee);
    } catch (e) {
      return next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createEmployeeSchema.parse(req.body);
      const employee = await EmployeesService.createEmployee(validated);
      return sendSuccess(res, 'Employee created successfully.', employee, 201);
    } catch (e) {
      return next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const targetId = getParam(req.params.id);
      const validated = updateEmployeeSchema.parse(req.body);
      const updated = await EmployeesService.updateEmployee(targetId, validated);
      return sendSuccess(res, 'Employee updated successfully.', updated);
    } catch (e) {
      return next(e);
    }
  }

  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = getParam(req.params.id);
      if (!req.file) {
        return sendError(res, 'No file uploaded.', [], 400);
      }

      const doc = await EmployeesService.addDocument(
        employeeId,
        req.file,
        req.body.documentType
      );
      return sendSuccess(res, 'Document uploaded successfully.', doc, 201);
    } catch (e) {
      return next(e);
    }
  }

  static async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const docId = getParam(req.params.docId);
      const doc = await EmployeesService.getDocument(docId);

      if (req.user?.role === Role.EMPLOYEE && req.user.employeeId !== doc.employeeId) {
        return sendError(res, 'Forbidden: You do not have access to this document.', [], 403);
      }

      const fullPath = path.join(config.uploadDir, doc.filePath);
      if (!fs.existsSync(fullPath)) {
        return sendError(res, 'Document file not found on server.', [], 404);
      }

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      return res.sendFile(fullPath);
    } catch (e) {
      return next(e);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const targetId = getParam(req.params.id);
      const result = await EmployeesService.deleteEmployee(targetId);
      return sendSuccess(res, result.message, result);
    } catch (e) {
      return next(e);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const docId = getParam(req.params.docId);
      const result = await EmployeesService.deleteDocument(docId);
      return sendSuccess(res, result.message, result);
    } catch (e) {
      return next(e);
    }
  }
}
