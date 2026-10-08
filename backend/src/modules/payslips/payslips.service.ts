import { prisma } from '../../config/prisma';
import { PDFService } from './pdf.service';
import { CompanyService } from '../company/company.service';

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
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
        payrollEmployee: {
          select: {
            grossEarnings: true,
            totalDeductions: true,
            netSalary: true,
            presentDays: true,
            lopDays: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  static async getPayslipById(id: string) {
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: { department: true, designation: true },
        },
        payrollEmployee: {
          include: { components: true },
        },
      },
    });
    if (!payslip) throw new Error('Payslip not found.');
    return payslip;
  }

  static async generatePDF(payslipId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const payslip = await this.getPayslipById(payslipId);
    const company = await CompanyService.getCompany();

    const buffer = await PDFService.generatePayslipPDF({
      company,
      employee: payslip.employee,
      payrollEmployee: payslip.payrollEmployee,
      payslipNumber: payslip.payslipNumber,
      month: payslip.month,
      year: payslip.year,
    });

    const fileName = `Payslip_${payslip.employee.employeeId}_${payslip.year}_${payslip.month}.pdf`;
    return { buffer, fileName };
  }
}
