import { prisma } from '../../config/prisma';
import { PayrollCalculationEngine, StatutoryRules, PayrollEmployeeInput } from './payroll-engine.service';
import { StatutoryService } from '../statutory/statutory.service';
import { PayrollStatus, Role } from '@prisma/client';

export class PayrollService {
  /**
   * Previews or runs payroll calculation for a month/year
   */
  static async calculateRun(month: number, year: number, preparedBy: string, isPreviewOnly = false) {
    // 1. Check if payroll for this period already exists and is LOCKED
    const existing = await prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
      include: {
        payrollEmployees: {
          include: {
            employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
            components: true,
          },
        },
      },
    });

    if (existing && existing.status === PayrollStatus.LOCKED) {
      if (isPreviewOnly) {
        return existing;
      }
      throw new Error(`Payroll for ${month}/${year} is LOCKED and cannot be recalculated.`);
    }

    // 2. Fetch statutory configurations applicable to this period
    const periodDate = new Date(Date.UTC(year, month - 1, 15));
    const [pfConfig, esiConfig, ptConfig, tdsConfig] = await Promise.all([
      StatutoryService.getActiveByType('PF', periodDate),
      StatutoryService.getActiveByType('ESI', periodDate),
      StatutoryService.getActiveByType('PROFESSIONAL_TAX', periodDate),
      StatutoryService.getActiveByType('TDS', periodDate),
    ]);

    const statutoryRules: StatutoryRules = {
      pf: pfConfig?.rulesJson as any,
      esi: esiConfig?.rulesJson as any,
      pt: ptConfig?.rulesJson as any,
      tds: tdsConfig?.rulesJson as any,
    };

    // 3. Working days in month (standard 30 or actual days)
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const workingDays = lastDayOfMonth;

    // 4. Load all active employees with their salary structure
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salary: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
        attendances: {
          where: {
            date: {
              gte: new Date(Date.UTC(year, month - 1, 1)),
              lte: new Date(Date.UTC(year, month, 0)),
            },
          },
        },
        leaveRequests: {
          where: {
            status: 'APPROVED',
            fromDate: { lte: new Date(Date.UTC(year, month, 0)) },
            toDate: { gte: new Date(Date.UTC(year, month - 1, 1)) },
          },
          include: { leaveType: true },
        },
      },
    });

    const calculatedEmployees: Array<{
      employee: any;
      calc: any;
      input: PayrollEmployeeInput;
    }> = [];

    let totalGross = 0;
    let totalDeductions = 0;
    let totalEmployerCost = 0;
    let totalNet = 0;

    for (const emp of employees) {
      if (!emp.salary) {
        // Skip or throw based on policy
        continue;
      }

      // Calculate attendance & LOP days
      let absentDays = 0;
      let lopDaysMarked = 0;
      let halfDays = 0;
      for (const att of emp.attendances) {
        if (att.status === 'ABSENT') absentDays++;
        if (att.status === 'LOP') lopDaysMarked++;
        if (att.status === 'HALF_DAY') halfDays += 0.5;
      }

      // Excess unpaid leaves
      let unpaidLeaveDays = 0;
      for (const lr of emp.leaveRequests) {
        if (!lr.leaveType.isPaid || lr.leaveType.code === 'LOP') {
          unpaidLeaveDays += lr.days;
        }
      }

      const totalLopDays = Math.min(workingDays, absentDays + lopDaysMarked + halfDays + unpaidLeaveDays);
      const components = (emp.salary.componentsJson as any[]) || [];

      const input: PayrollEmployeeInput = {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        monthlyGross: emp.salary.monthlyGross,
        components,
        workingDays,
        presentDays: Math.max(0, workingDays - totalLopDays),
        lopDays: totalLopDays,
        taxRegime: emp.taxRegime,
      };

      const result = PayrollCalculationEngine.computeEmployeePayroll(input, statutoryRules);

      totalGross += result.grossEarnings;
      totalDeductions += result.totalDeductions;
      totalEmployerCost += result.employerContributions;
      totalNet += result.netSalary;

      calculatedEmployees.push({
        employee: emp,
        calc: result,
        input,
      });
    }

    if (isPreviewOnly) {
      const items = calculatedEmployees.map((ce) => ({
        employeeId: ce.employee.id,
        empCode: ce.employee.employeeId,
        name: `${ce.employee.firstName} ${ce.employee.lastName}`,
        department: ce.employee.department?.name || 'N/A',
        workingDays: ce.calc.workingDays,
        presentDays: ce.calc.presentDays,
        lopDays: ce.calc.lopDays,
        gross: ce.calc.grossEarnings,
        deductions: ce.calc.totalDeductions,
        net: ce.calc.netSalary,
        grossEarnings: ce.calc.grossEarnings,
        totalDeductions: ce.calc.totalDeductions,
        netSalary: ce.calc.netSalary,
        employerCost: ce.calc.employerContributions,
        components: ce.calc.components,
      }));

      return {
        month,
        year,
        status: existing?.status || PayrollStatus.DRAFT,
        totalEmployees: calculatedEmployees.length,
        totalGross,
        totalDeductions,
        totalEmployerCost,
        totalNet,
        items,
        employees: items,
      };
    }

    // Persist run in database transaction
    return prisma.$transaction(async (tx) => {
      // Upsert payroll run record
      const run = await tx.payrollRun.upsert({
        where: { month_year: { month, year } },
        update: {
          status: PayrollStatus.DRAFT,
          totalEmployees: calculatedEmployees.length,
          totalGross,
          totalDeductions,
          totalEmployerCost,
          totalNet,
          preparedById: preparedBy,
          preparedAt: new Date(),
        },
        create: {
          month,
          year,
          status: PayrollStatus.DRAFT,
          totalEmployees: calculatedEmployees.length,
          totalGross,
          totalDeductions,
          totalEmployerCost,
          totalNet,
          preparedById: preparedBy,
          preparedAt: new Date(),
        },
      });

      // Clear previous unapproved employee calculations for this run
      await tx.payrollEmployee.deleteMany({ where: { payrollRunId: run.id } });

      for (const item of calculatedEmployees) {
        const pe = await tx.payrollEmployee.create({
          data: {
            payrollRunId: run.id,
            employeeId: item.employee.id,
            workingDays: item.calc.workingDays,
            presentDays: item.calc.presentDays,
            lopDays: item.calc.lopDays,
            grossEarnings: item.calc.grossEarnings,
            totalDeductions: item.calc.totalDeductions,
            employerContributions: item.calc.employerContributions,
            netSalary: item.calc.netSalary,
            ctcSnapshot: item.employee.salary?.componentsJson as any,
            statutorySnapshot: statutoryRules as any,
          },
        });

        // Create individual components
        for (const comp of item.calc.components) {
          await tx.payrollComponent.create({
            data: {
              payrollEmployeeId: pe.id,
              name: comp.name,
              code: comp.code,
              type: comp.type,
              amount: comp.amount,
              calculationNote: comp.note,
            },
          });
        }
      }

      return tx.payrollRun.findUnique({
        where: { id: run.id },
        include: {
          payrollEmployees: {
            include: {
              employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
              components: true,
            },
          },
        },
      });
    });
  }

  static async getRun(month: number, year: number) {
    return prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
      include: {
        payrollEmployees: {
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
            components: true,
          },
        },
      },
    });
  }

  static async listRuns() {
    return prisma.payrollRun.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /**
   * Admin approves payroll run
   */
  static async approveRun(id: string, adminId: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new Error('Payroll run not found.');
    if (run.status === PayrollStatus.LOCKED) throw new Error('Payroll run is already locked.');

    return prisma.payrollRun.update({
      where: { id },
      data: {
        status: PayrollStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Admin locks payroll run and triggers payslip creation
   */
  static async lockRun(id: string, adminId: string) {
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { payrollEmployees: true },
    });
    if (!run) throw new Error('Payroll run not found.');
    if (run.status === PayrollStatus.LOCKED) throw new Error('Payroll is already locked.');

    return prisma.$transaction(async (tx) => {
      const locked = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.LOCKED,
          lockedById: adminId,
          lockedAt: new Date(),
          approvedById: run.approvedById || adminId,
          approvedAt: run.approvedAt || new Date(),
        },
      });

      // Generate payslip records for all employees in this run
      for (const pe of run.payrollEmployees) {
        const payslipNumber = `NEXUS-${run.year}-${String(run.month).padStart(2, '0')}-${pe.employeeId.slice(0, 8).toUpperCase()}`;
        await tx.payslip.upsert({
          where: { payrollEmployeeId: pe.id },
          update: {
            netSalary: pe.netSalary,
          },
          create: {
            payrollEmployeeId: pe.id,
            employeeId: pe.employeeId,
            payslipNumber,
            month: run.month,
            year: run.year,
            netSalary: pe.netSalary,
          },
        });
      }

      return locked;
    });
  }
}
