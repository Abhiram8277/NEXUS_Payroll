import { prisma } from '../../config/prisma';
import { PDFService } from './pdf.service';
import { CompanyService } from '../company/company.service';
import { PayrollStatus } from '@prisma/client';

export class PayslipsService {
  static async listPayslips(employeeId?: string, month?: number, year?: number) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = month;
    if (year) where.year = year;

    return prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
        payrollEmployee: {
          select: {
            id: true,
            workingDays: true,
            grossEarnings: true,
            totalDeductions: true,
            employerContributions: true,
            netSalary: true,
            presentDays: true,
            lopDays: true,
            components: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  static async getPayslipById(id: string) {
    const payslip = await prisma.payslip.findFirst({
      where: {
        OR: [{ id }, { payrollEmployeeId: id }],
      },
      include: {
        employee: {
          include: { department: true, designation: true },
        },
        payrollEmployee: {
          include: {
            components: true,
            payrollRun: true,
          },
        },
      },
    });

    if (!payslip) {
      // Check if id refers to a PayrollEmployee whose run is not yet LOCKED
      const unfinalizedPe = await prisma.payrollEmployee.findUnique({
        where: { id },
        include: { payrollRun: true },
      });
      if (unfinalizedPe && unfinalizedPe.payrollRun.status !== PayrollStatus.LOCKED) {
        const err: any = new Error(
          `Payslip is not available because the payroll run is currently ${unfinalizedPe.payrollRun.status}. Payroll must be LOCKED first.`
        );
        err.statusCode = 400;
        throw err;
      }

      const err: any = new Error('Payslip not found.');
      err.statusCode = 404;
      throw err;
    }

    if (
      payslip.payrollEmployee?.payrollRun &&
      payslip.payrollEmployee.payrollRun.status !== PayrollStatus.LOCKED
    ) {
      const err: any = new Error('Payslip cannot be downloaded before payroll is LOCKED.');
      err.statusCode = 400;
      throw err;
    }

    return payslip;
  }

  static async generatePDF(payslipId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const payslip = await this.getPayslipById(payslipId);
    const rawCompany = await CompanyService.getCompany();
    const company = rawCompany || {
      id: 'default-org',
      name: 'NEXUS Payroll',
      tagline: 'Payroll, without the paperwork.',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pinCode: '',
      email: '',
      phone: '',
      pan: '',
      tan: '',
      financialYear: '2026-2027',
      payrollFrequency: 'MONTHLY',
      logo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const buffer = await PDFService.generatePayslipPDF({
      company,
      employee: payslip.employee,
      payrollEmployee: payslip.payrollEmployee,
      payslipNumber: payslip.payslipNumber,
      month: payslip.month,
      year: payslip.year,
    });

    const monthStr = String(payslip.month).padStart(2, '0');
    const fileName = `Payslip_${payslip.employee.employeeId}_${payslip.year}_${monthStr}.pdf`;
    return { buffer, fileName };
  }
}
