import { prisma } from '../../config/prisma';
import { PayrollCalculationEngine, StatutoryRules, PayrollEmployeeInput } from './payroll-engine.service';
import { StatutoryService } from '../statutory/statutory.service';
import { EmailService } from '../email/email.service';
import { PayrollStatus, Role } from '@prisma/client';

export class PayrollService {
  /**
   * Previews or runs payroll calculation for a month/year
   */
  static async calculateRun(month: number, year: number, preparedBy: string, isPreviewOnly = false) {
    // 1. Check if payroll for this period already exists
    const existing = await prisma.payrollRun.findUnique({
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
                email: true,
                department: { select: { name: true } },
              },
            },
            components: true,
            payslip: true,
          },
        },
      },
    });

    if (existing && existing.status === PayrollStatus.LOCKED) {
      if (isPreviewOnly) {
        return existing;
      }
      const err: any = new Error(`Payroll for ${month}/${year} is LOCKED and cannot be recalculated.`);
      err.statusCode = 400;
      throw err;
    }

    if (existing && existing.status === PayrollStatus.APPROVED && !isPreviewOnly) {
      const err: any = new Error(
        `Payroll for ${month}/${year} is already APPROVED and cannot be recalculated unless rejected.`
      );
      err.statusCode = 400;
      throw err;
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

    // 3. Working days in month
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
      orderBy: { employeeId: 'asc' },
    });

    const calculatedEmployees: Array<{
      employee: any;
      calc: any;
      input: PayrollEmployeeInput;
    }> = [];

    const unassignedEmployees: Array<{
      id: string;
      employeeId: string;
      name: string;
      department: string;
    }> = [];

    let totalGross = 0;
    let totalDeductions = 0;
    let totalEmployerCost = 0;
    let totalNet = 0;

    for (const emp of employees) {
      if (!emp.salary) {
        unassignedEmployees.push({
          id: emp.id,
          employeeId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department?.name || 'Unassigned',
        });
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
        unassignedEmployees,
        warnings:
          unassignedEmployees.length > 0
            ? [`${unassignedEmployees.length} active employee(s) do not have an assigned salary structure and were excluded from calculation.`]
            : [],
      };
    }

    // Persist run in database transaction
    return prisma.$transaction(async (tx) => {
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
          rejectionReason: null,
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
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  department: { select: { name: true } },
                },
              },
              components: true,
              payslip: true,
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
                email: true,
                department: { select: { name: true } },
                designation: { select: { name: true } },
              },
            },
            components: true,
            payslip: true,
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
   * HR or Admin submits a DRAFT or REJECTED payroll run for Admin approval (transitions to REVIEW)
   */
  static async submitRunForApproval(id: string, submittedBy: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) {
      const err: any = new Error('Payroll run not found.');
      err.statusCode = 404;
      throw err;
    }

    if (run.status !== PayrollStatus.DRAFT && run.status !== PayrollStatus.REJECTED) {
      const err: any = new Error(
        `Cannot submit payroll run with status ${run.status}. Only DRAFT or REJECTED runs can be submitted for approval.`
      );
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.payrollRun.update({
      where: { id },
      data: {
        status: PayrollStatus.REVIEW,
        submittedById: submittedBy,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { email: true },
    });
    for (const admin of admins) {
      await EmailService.sendPayrollWorkflowEmail({
        to: admin.email,
        month: updated.month,
        year: updated.year,
        action: 'SUBMITTED',
        totalEmployees: updated.totalEmployees,
        totalNet: updated.totalNet,
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Admin approves payroll run
   */
  static async approveRun(id: string, adminId: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) {
      const err: any = new Error('Payroll run not found.');
      err.statusCode = 404;
      throw err;
    }
    if (run.status === PayrollStatus.LOCKED) {
      const err: any = new Error('Payroll run is already locked.');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.payrollRun.update({
      where: { id },
      data: {
        status: PayrollStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    const hrUsers = await prisma.user.findMany({
      where: { role: Role.HR, isActive: true },
      select: { email: true },
    });
    for (const hr of hrUsers) {
      await EmailService.sendPayrollWorkflowEmail({
        to: hr.email,
        month: updated.month,
        year: updated.year,
        action: 'APPROVED',
        totalEmployees: updated.totalEmployees,
        totalNet: updated.totalNet,
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Admin rejects payroll run with a mandatory reason
   */
  static async rejectRun(id: string, adminId: string, reason: string) {
    if (!reason || !reason.trim()) {
      const err: any = new Error('A rejection reason is required when rejecting a payroll run.');
      err.statusCode = 400;
      throw err;
    }

    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) {
      const err: any = new Error('Payroll run not found.');
      err.statusCode = 404;
      throw err;
    }
    if (run.status === PayrollStatus.LOCKED) {
      const err: any = new Error('Cannot reject a payroll run that is already LOCKED.');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.payrollRun.update({
      where: { id },
      data: {
        status: PayrollStatus.REJECTED,
        rejectedById: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
      },
    });

    const hrUsers = await prisma.user.findMany({
      where: { role: Role.HR, isActive: true },
      select: { email: true },
    });
    for (const hr of hrUsers) {
      await EmailService.sendPayrollWorkflowEmail({
        to: hr.email,
        month: updated.month,
        year: updated.year,
        action: 'REJECTED',
        totalEmployees: updated.totalEmployees,
        totalNet: updated.totalNet,
        reason: reason.trim(),
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Admin locks payroll run and triggers payslip creation
   */
  static async lockRun(id: string, adminId: string) {
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { payrollEmployees: true },
    });
    if (!run) {
      const err: any = new Error('Payroll run not found.');
      err.statusCode = 404;
      throw err;
    }
    if (run.status === PayrollStatus.LOCKED) {
      const err: any = new Error('Payroll is already locked.');
      err.statusCode = 400;
      throw err;
    }
    if (run.status !== PayrollStatus.APPROVED) {
      const err: any = new Error('Payroll run must be APPROVED by Admin before it can be LOCKED.');
      err.statusCode = 400;
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      const locked = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.LOCKED,
          lockedById: adminId,
          lockedAt: new Date(),
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
            emailStatus: 'PENDING',
          },
        });
      }

      return locked;
    });
  }

  /**
   * HR or Admin distributes payslips via email after payroll is LOCKED
   */
  static async distributePayslips(
    id: string,
    senderEmail: string,
    options: { employeeIds?: string[]; retryFailedOnly?: boolean } = {}
  ) {
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollEmployees: {
          include: {
            employee: true,
            payslip: true,
          },
        },
      },
    });

    if (!run) {
      const err: any = new Error('Payroll run not found.');
      err.statusCode = 404;
      throw err;
    }

    if (run.status !== PayrollStatus.LOCKED) {
      const err: any = new Error(
        `Cannot distribute payslips for a ${run.status} payroll run. Payroll must be APPROVED and LOCKED first.`
      );
      err.statusCode = 400;
      throw err;
    }

    let targets = run.payrollEmployees.filter((pe) => Boolean(pe.payslip));

    if (options.employeeIds && options.employeeIds.length > 0) {
      const filterSet = new Set(options.employeeIds);
      targets = targets.filter((pe) => filterSet.has(pe.employeeId) || filterSet.has(pe.employee.employeeId));
    }

    if (options.retryFailedOnly) {
      targets = targets.filter((pe) => pe.payslip?.emailStatus === 'FAILED');
    }

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{
      payslipId: string;
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      email: string;
      status: string;
      error?: string | null;
    }> = [];

    for (const pe of targets) {
      const ps = pe.payslip!;
      const emp = pe.employee;

      const emailLog = await EmailService.sendPayslipDeliveryEmail({
        to: emp.email,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeId,
        month: run.month,
        year: run.year,
        payslipNumber: ps.payslipNumber,
        netSalary: ps.netSalary,
        payslipId: ps.id,
      });

      const deliveryStatus = emailLog.status === 'SENT' ? 'SENT' : 'FAILED';
      if (deliveryStatus === 'SENT') sentCount++;
      else failedCount++;

      await prisma.payslip.update({
        where: { id: ps.id },
        data: {
          emailStatus: deliveryStatus,
          sentAt: deliveryStatus === 'SENT' ? new Date() : ps.sentAt,
          emailError: emailLog.error,
        },
      });

      results.push({
        payslipId: ps.id,
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        status: deliveryStatus,
        error: emailLog.error,
      });
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id },
      data: {
        payslipsSent: sentCount > 0 || run.payslipsSent,
        payslipsSentAt: sentCount > 0 ? new Date() : run.payslipsSentAt,
        payslipsSentById: senderEmail,
      },
    });

    return {
      run: updatedRun,
      totalPayslips: targets.length,
      sentCount,
      failedCount,
      results,
    };
  }

  /**
   * Delete a DRAFT or REJECTED payroll run
   */
  static async deleteRun(id: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) {
      const err: any = new Error('Payroll run not found.');
      err.statusCode = 404;
      throw err;
    }

    if (run.status !== PayrollStatus.DRAFT && run.status !== PayrollStatus.REJECTED) {
      const err: any = new Error(
        `Cannot delete a payroll run with status ${run.status}. Only DRAFT or REJECTED runs can be deleted.`
      );
      err.statusCode = 400;
      throw err;
    }

    await prisma.payrollRun.delete({ where: { id } });
    return { message: 'Draft payroll run deleted successfully.' };
  }
}
