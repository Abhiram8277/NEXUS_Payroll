import { prisma } from '../../config/prisma';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';

export class ReportsService {
  // --- Dashboard Analytics ---
  static async getAdminDashboard() {
    const [
      totalEmployees,
      activeEmployees,
      onboardingEmployees,
      pendingLeaves,
      departments,
      latestRun,
      recentEmployees,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.employee.count({ where: { status: 'ONBOARDING' } }),
      prisma.leaveRequest.count({ where: { status: 'APPLIED' } }),
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { employees: true } },
        },
      }),
      prisma.payrollRun.findFirst({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.employee.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      }),
    ]);

    return {
      kpis: {
        totalEmployees,
        activeEmployees,
        onboardingEmployees,
        pendingLeaves,
        currentPayrollStatus: latestRun?.status || 'NOT_STARTED',
        currentGrossPayroll: latestRun?.totalGross || 0,
        currentNetPayroll: latestRun?.totalNet || 0,
        currentEmployerCost: latestRun?.totalEmployerCost || 0,
        currentPayrollPeriod: latestRun ? `${latestRun.month}/${latestRun.year}` : 'N/A',
      },
      departmentDistribution: departments.map((d) => ({
        name: d.name,
        code: d.code,
        count: d._count.employees,
      })),
      recentEmployees,
    };
  }

  static async getEmployeeDashboard(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        designation: true,
        salary: true,
      },
    });
    if (!employee) throw new Error('Employee not found');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [latestPayslip, leaveBalances, pendingLeaves, upcomingHolidays, attendances] =
      await Promise.all([
        prisma.payslip.findFirst({
          where: { employeeId },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          include: { payrollEmployee: true },
        }),
        prisma.leaveBalance.findMany({
          where: { employeeId, year: currentYear },
          include: { leaveType: true },
        }),
        prisma.leaveRequest.findMany({
          where: { employeeId, status: 'APPLIED' },
          include: { leaveType: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.holiday.findMany({
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 4,
        }),
        prisma.attendance.findMany({
          where: {
            employeeId,
            date: {
              gte: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
              lte: new Date(Date.UTC(currentYear, currentMonth, 0)),
            },
          },
        }),
      ]);

    let presentDays = 0;
    let lopDays = 0;
    for (const a of attendances) {
      if (a.status === 'PRESENT') presentDays++;
      if (a.status === 'HALF_DAY') presentDays += 0.5;
      if (a.status === 'LOP' || a.status === 'ABSENT') lopDays++;
    }

    return {
      profile: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name,
        designation: employee.designation?.name,
        monthlyGross: employee.salary?.monthlyGross || 0,
        ctcAnnual: employee.salary?.ctcAnnual || 0,
      },
      latestPayslip,
      leaveBalances,
      pendingLeaves,
      upcomingHolidays,
      currentMonthAttendance: {
        presentDays,
        lopDays,
        recordedDays: attendances.length,
      },
    };
  }

  // --- Reports ---

  static async getPayrollSummaryReport(year?: number) {
    const runs = await prisma.payrollRun.findMany({
      where: year ? { year } : undefined,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return runs.map((r) => ({
      period: `${r.month}/${r.year}`,
      status: r.status,
      employees: r.totalEmployees,
      gross: r.totalGross,
      deductions: r.totalDeductions,
      employerCost: r.totalEmployerCost,
      net: r.totalNet,
      lockedAt: r.lockedAt ? r.lockedAt.toISOString().split('T')[0] : 'No',
    }));
  }

  static async getSalaryRegisterReport(month: number, year: number) {
    const run = await prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
      include: {
        payrollEmployees: {
          include: {
            employee: {
              include: { department: true, designation: true },
            },
            components: true,
          },
          orderBy: { employee: { employeeId: 'asc' } },
        },
      },
    });

    if (!run) return [];

    return run.payrollEmployees.map((pe) => {
      const basic = pe.components.find((c) => c.code === 'BASIC')?.amount || 0;
      const hra = pe.components.find((c) => c.code === 'HRA')?.amount || 0;
      const pf = pe.components.find((c) => c.code === 'PF_EE')?.amount || 0;
      const esi = pe.components.find((c) => c.code === 'ESI_EE')?.amount || 0;
      const pt = pe.components.find((c) => c.code === 'PT')?.amount || 0;
      const tds = pe.components.find((c) => c.code === 'TDS')?.amount || 0;
      const allowances = pe.grossEarnings - basic - hra;

      return {
        employeeId: pe.employee.employeeId,
        name: `${pe.employee.firstName} ${pe.employee.lastName}`,
        department: pe.employee.department?.name || 'N/A',
        designation: pe.employee.designation?.name || 'N/A',
        workingDays: pe.workingDays,
        presentDays: pe.presentDays,
        lopDays: pe.lopDays,
        basic,
        hra,
        allowances,
        gross: pe.grossEarnings,
        pf,
        esi,
        pt,
        tds,
        totalDeductions: pe.totalDeductions,
        net: pe.netSalary,
      };
    });
  }

  static async getDepartmentCostReport(month: number, year: number) {
    const run = await prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
      include: {
        payrollEmployees: {
          include: {
            employee: { include: { department: true } },
          },
        },
      },
    });

    if (!run) return [];

    const map = new Map<
      string,
      {
        deptName: string;
        department: string;
        count: number;
        headcount: number;
        gross: number;
        employerCost: number;
        totalCost: number;
      }
    >();

    for (const pe of run.payrollEmployees) {
      const deptName = pe.employee.department?.name || 'Unassigned';
      const existing = map.get(deptName) || {
        deptName,
        department: deptName,
        count: 0,
        headcount: 0,
        gross: 0,
        employerCost: 0,
        totalCost: 0,
      };

      existing.count++;
      existing.headcount++;
      existing.gross += pe.grossEarnings;
      existing.employerCost += pe.employerContributions;
      existing.totalCost += pe.grossEarnings + pe.employerContributions;
      map.set(deptName, existing);
    }

    return Array.from(map.values());
  }

  // --- Export Helpers ---

  static generateExcel(data: any[], sheetName: string): Buffer {
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  static generateCSV(data: any[]): string {
    const ws = xlsx.utils.json_to_sheet(data);
    return xlsx.utils.sheet_to_csv(ws);
  }

  static generateReportPDF(title: string, headers: string[], rows: any[][]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header Banner
      doc.rect(30, 30, 782, 50).fill('#0B132B');
      doc.fillColor('#06B6D4').fontSize(18).font('Helvetica-Bold').text('NEXUS', 45, 42);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica').text('Payroll, without the paperwork.', 45, 62);
      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text(title.toUpperCase(), 400, 42, { align: 'right', width: 390 });

      // Table Header
      let y = 100;
      doc.rect(30, y, 782, 22).fill('#E2E8F0');
      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold');

      const colWidth = 782 / headers.length;
      headers.forEach((h, idx) => {
        doc.text(h, 35 + idx * colWidth, y + 6, { width: colWidth - 10, align: 'left' });
      });

      y += 24;
      doc.font('Helvetica').fontSize(8).fillColor('#1E293B');

      rows.forEach((row, rowIdx) => {
        if (y > 540) {
          doc.addPage({ layout: 'landscape', margin: 30 });
          y = 40;
        }

        if (rowIdx % 2 === 0) {
          doc.rect(30, y, 782, 18).fill('#F8FAFC');
          doc.fillColor('#1E293B');
        }

        row.forEach((cell, idx) => {
          doc.text(String(cell), 35 + idx * colWidth, y + 4, { width: colWidth - 10, align: 'left' });
        });

        y += 18;
      });

      // Footer
      doc.fillColor('#94A3B8').fontSize(7).text(
        `Generated by NEXUS on ${new Date().toLocaleDateString('en-IN')}. Confidentially protected.`,
        30,
        560,
        { align: 'center', width: 782 }
      );

      doc.end();
    });
  }
}
