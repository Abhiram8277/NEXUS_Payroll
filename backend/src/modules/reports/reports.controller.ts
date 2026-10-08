import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { sendSuccess, sendError } from '../../utils/response';
import { Role } from '@prisma/client';

export class ReportsController {
  // Dashboards
  static async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportsService.getAdminDashboard();
      return sendSuccess(res, 'Admin dashboard statistics retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getEmployeeDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        return sendError(res, 'No linked employee profile found.', [], 404);
      }
      const data = await ReportsService.getEmployeeDashboard(req.user.employeeId);
      return sendSuccess(res, 'Employee dashboard statistics retrieved.', data);
    } catch (e) { return next(e); }
  }

  // Reports JSON & Export
  static async getPayrollSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const data = await ReportsService.getPayrollSummaryReport(year);

      const format = req.query.format as string;
      if (format === 'csv') {
        const csv = ReportsService.generateCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Payroll_Summary.csv"');
        return res.send(csv);
      } else if (format === 'excel') {
        const buffer = ReportsService.generateExcel(data, 'Payroll Summary');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Payroll_Summary.xlsx"');
        return res.send(buffer);
      } else if (format === 'pdf') {
        const headers = ['Period', 'Status', 'Employees', 'Gross', 'Deductions', 'Employer Cost', 'Net Pay'];
        const rows = data.map((r) => [r.period, r.status, r.employees, `₹${r.gross}`, `₹${r.deductions}`, `₹${r.employerCost}`, `₹${r.net}`]);
        const pdfBuffer = await ReportsService.generateReportPDF('Payroll Summary Report', headers, rows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Payroll_Summary.pdf"');
        return res.send(pdfBuffer);
      }

      return sendSuccess(res, 'Payroll summary retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getSalaryRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
      const data = await ReportsService.getSalaryRegisterReport(month, year);

      const format = req.query.format as string;
      if (format === 'csv') {
        const csv = ReportsService.generateCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="Salary_Register_${year}_${month}.csv"`);
        return res.send(csv);
      } else if (format === 'excel') {
        const buffer = ReportsService.generateExcel(data, 'Salary Register');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Salary_Register_${year}_${month}.xlsx"`);
        return res.send(buffer);
      } else if (format === 'pdf') {
        const headers = ['Emp ID', 'Name', 'Department', 'Basic', 'HRA', 'Gross', 'PF', 'PT', 'TDS', 'Total Ded', 'Net Pay'];
        const rows = data.map((r) => [
          r.employeeId,
          r.name,
          r.department,
          `₹${r.basic}`,
          `₹${r.hra}`,
          `₹${r.gross}`,
          `₹${r.pf}`,
          `₹${r.pt}`,
          `₹${r.tds}`,
          `₹${r.totalDeductions}`,
          `₹${r.net}`,
        ]);
        const pdfBuffer = await ReportsService.generateReportPDF(`Salary Register ${month}/${year}`, headers, rows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Salary_Register_${year}_${month}.pdf"`);
        return res.send(pdfBuffer);
      }

      return sendSuccess(res, 'Salary register retrieved.', data);
    } catch (e) { return next(e); }
  }

  static async getDepartmentCost(req: Request, res: Response, next: NextFunction) {
    try {
      const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
      const data = await ReportsService.getDepartmentCostReport(month, year);

      const format = req.query.format as string;
      if (format === 'csv') {
        const csv = ReportsService.generateCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="Department_Cost_${year}_${month}.csv"`);
        return res.send(csv);
      } else if (format === 'excel') {
        const buffer = ReportsService.generateExcel(data, 'Department Cost');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Department_Cost_${year}_${month}.xlsx"`);
        return res.send(buffer);
      } else if (format === 'pdf') {
        const headers = ['Department', 'Employees', 'Gross Payroll', 'Employer Cost', 'Total Cost'];
        const rows = data.map((r) => [r.deptName, r.count, `₹${r.gross}`, `₹${r.employerCost}`, `₹${r.totalCost}`]);
        const pdfBuffer = await ReportsService.generateReportPDF(`Department Cost ${month}/${year}`, headers, rows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Department_Cost_${year}_${month}.pdf"`);
        return res.send(pdfBuffer);
      }

      return sendSuccess(res, 'Department cost retrieved.', data);
    } catch (e) { return next(e); }
  }
}
