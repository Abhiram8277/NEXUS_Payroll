import { Request, Response, NextFunction } from 'express';
import { MastersService } from './masters.service';
import { sendSuccess, getParam } from '../../utils/response';

export class MastersController {
  // Departments
  static async getDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.getDepartments(req.query.all === 'true');
      return sendSuccess(res, 'Departments retrieved.', data);
    } catch (e) { return next(e); }
  }
  static async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.createDepartment(req.body);
      return sendSuccess(res, 'Department created successfully.', data, 201);
    } catch (e) { return next(e); }
  }
  static async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.updateDepartment(getParam(req.params.id), req.body);
      return sendSuccess(res, 'Department updated successfully.', data);
    } catch (e) { return next(e); }
  }
  static async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      await MastersService.deleteDepartment(getParam(req.params.id));
      return sendSuccess(res, 'Department deleted/deactivated successfully.');
    } catch (e) { return next(e); }
  }

  // Designations
  static async getDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.getDesignations(req.query.all === 'true');
      return sendSuccess(res, 'Designations retrieved.', data);
    } catch (e) { return next(e); }
  }
  static async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.createDesignation(req.body);
      return sendSuccess(res, 'Designation created successfully.', data, 201);
    } catch (e) { return next(e); }
  }
  static async updateDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.updateDesignation(getParam(req.params.id), req.body);
      return sendSuccess(res, 'Designation updated successfully.', data);
    } catch (e) { return next(e); }
  }
  static async deleteDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      await MastersService.deleteDesignation(getParam(req.params.id));
      return sendSuccess(res, 'Designation deleted/deactivated successfully.');
    } catch (e) { return next(e); }
  }

  // Locations
  static async getLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.getLocations(req.query.all === 'true');
      return sendSuccess(res, 'Locations retrieved.', data);
    } catch (e) { return next(e); }
  }
  static async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.createLocation(req.body);
      return sendSuccess(res, 'Location created successfully.', data, 201);
    } catch (e) { return next(e); }
  }
  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.updateLocation(getParam(req.params.id), req.body);
      return sendSuccess(res, 'Location updated successfully.', data);
    } catch (e) { return next(e); }
  }
  static async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      await MastersService.deleteLocation(getParam(req.params.id));
      return sendSuccess(res, 'Location deleted/deactivated successfully.');
    } catch (e) { return next(e); }
  }

  // Leave Types
  static async getLeaveTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.getLeaveTypes(req.query.all === 'true');
      return sendSuccess(res, 'Leave types retrieved.', data);
    } catch (e) { return next(e); }
  }
  static async createLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.createLeaveType(req.body);
      return sendSuccess(res, 'Leave type created successfully.', data, 201);
    } catch (e) { return next(e); }
  }
  static async updateLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.updateLeaveType(getParam(req.params.id), req.body);
      return sendSuccess(res, 'Leave type updated successfully.', data);
    } catch (e) { return next(e); }
  }
  static async deleteLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      await MastersService.deleteLeaveType(getParam(req.params.id));
      return sendSuccess(res, 'Leave type deactivated successfully.');
    } catch (e) { return next(e); }
  }

  // Salary Components
  static async getSalaryComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.getSalaryComponents(req.query.all === 'true');
      return sendSuccess(res, 'Salary components retrieved.', data);
    } catch (e) { return next(e); }
  }
  static async createSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.createSalaryComponent(req.body);
      return sendSuccess(res, 'Salary component created successfully.', data, 201);
    } catch (e) { return next(e); }
  }
  static async updateSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.updateSalaryComponent(getParam(req.params.id), req.body);
      return sendSuccess(res, 'Salary component updated successfully.', data);
    } catch (e) { return next(e); }
  }
  static async deleteSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      await MastersService.deleteSalaryComponent(getParam(req.params.id));
      return sendSuccess(res, 'Salary component deactivated successfully.');
    } catch (e) { return next(e); }
  }

  // Holidays
  static async getHolidays(req: Request, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const data = await MastersService.getHolidays(year);
      return sendSuccess(res, 'Holidays retrieved.', data);
    } catch (e) { return next(e); }
  }
  static async createHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.createHoliday(req.body);
      return sendSuccess(res, 'Holiday added successfully.', data, 201);
    } catch (e) { return next(e); }
  }
  static async updateHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MastersService.updateHoliday(getParam(req.params.id), req.body);
      return sendSuccess(res, 'Holiday updated successfully.', data);
    } catch (e) { return next(e); }
  }
  static async deleteHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      await MastersService.deleteHoliday(getParam(req.params.id));
      return sendSuccess(res, 'Holiday removed successfully.');
    } catch (e) { return next(e); }
  }
}
