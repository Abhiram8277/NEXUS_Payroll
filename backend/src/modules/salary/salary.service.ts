import { prisma } from '../../config/prisma';
import { CalculationType, ComponentType, EmploymentStatus } from '@prisma/client';

export class SalaryService {
  // --- Templates ---
  static async listTemplates(includeInactive = false) {
    return prisma.salaryTemplate.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        components: {
          include: { component: true },
        },
        _count: { select: { employeeSalaries: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getTemplate(id: string) {
    const template = await prisma.salaryTemplate.findUnique({
      where: { id },
      include: {
        components: {
          include: { component: true },
        },
        _count: { select: { employeeSalaries: true } },
      },
    });
    if (!template) {
      const err: any = new Error('Salary template not found.');
      err.statusCode = 404;
      throw err;
    }
    return template;
  }

  static async createTemplate(data: {
    name: string;
    description?: string;
    components: Array<{
      componentId: string;
      calculationType: CalculationType;
      value: number;
      formula?: string;
    }>;
  }) {
    if (!data.name || !data.name.trim()) {
      const err: any = new Error('Template name is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!data.components || data.components.length === 0) {
      const err: any = new Error('Salary template must include at least one salary component.');
      err.statusCode = 400;
      throw err;
    }

    // Check duplicate component IDs in the same template
    const seenIds = new Set<string>();
    for (const item of data.components) {
      if (seenIds.has(item.componentId)) {
        const err: any = new Error('Duplicate salary component detected in template.');
        err.statusCode = 400;
        throw err;
      }
      if (Number(item.value) < 0) {
        const err: any = new Error('Component value cannot be negative.');
        err.statusCode = 400;
        throw err;
      }
      seenIds.add(item.componentId);
    }

    return prisma.$transaction(async (tx) => {
      const template = await tx.salaryTemplate.create({
        data: {
          name: data.name.trim(),
          description: data.description,
        },
      });

      for (const item of data.components) {
        await tx.salaryTemplateComponent.create({
          data: {
            templateId: template.id,
            componentId: item.componentId,
            calculationType: item.calculationType,
            value: Number(item.value) || 0,
            formula: item.formula,
          },
        });
      }

      return tx.salaryTemplate.findUnique({
        where: { id: template.id },
        include: {
          components: { include: { component: true } },
          _count: { select: { employeeSalaries: true } },
        },
      });
    });
  }

  static async updateTemplate(id: string, data: any) {
    const existing = await prisma.salaryTemplate.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error('Salary template not found.');
      err.statusCode = 404;
      throw err;
    }

    if (data.components) {
      if (!Array.isArray(data.components) || data.components.length === 0) {
        const err: any = new Error('Salary template must include at least one salary component.');
        err.statusCode = 400;
        throw err;
      }
      const seenIds = new Set<string>();
      for (const item of data.components) {
        if (seenIds.has(item.componentId)) {
          const err: any = new Error('Duplicate salary component detected in template.');
          err.statusCode = 400;
          throw err;
        }
        if (Number(item.value) < 0) {
          const err: any = new Error('Component value cannot be negative.');
          err.statusCode = 400;
          throw err;
        }
        seenIds.add(item.componentId);
      }
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      await tx.salaryTemplate.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          description: data.description,
          isActive: data.isActive,
        },
      });

      if (data.components) {
        await tx.salaryTemplateComponent.deleteMany({ where: { templateId: id } });
        for (const item of data.components) {
          await tx.salaryTemplateComponent.create({
            data: {
              templateId: id,
              componentId: item.componentId,
              calculationType: item.calculationType,
              value: Number(item.value) || 0,
              formula: item.formula,
            },
          });
        }
      }

      return tx.salaryTemplate.findUnique({
        where: { id },
        include: {
          components: { include: { component: true } },
          _count: { select: { employeeSalaries: true } },
        },
      });
    });

    // Optionally recalculate active EmployeeSalary structures linked to this template
    // (Does NOT touch locked historical PayrollEmployee snapshots)
    if (data.recalculateAssigned && updatedTemplate) {
      const assignedRecords = await prisma.employeeSalary.findMany({
        where: { templateId: id },
      });
      for (const rec of assignedRecords) {
        const newComponents = await this.computeComponentsForGross(rec.monthlyGross, id);
        await prisma.employeeSalary.update({
          where: { id: rec.id },
          data: { componentsJson: newComponents },
        });
      }
    }

    return updatedTemplate;
  }

  static async duplicateTemplate(id: string, customName?: string) {
    const source = await prisma.salaryTemplate.findUnique({
      where: { id },
      include: { components: true },
    });
    if (!source) {
      const err: any = new Error('Source salary template not found.');
      err.statusCode = 404;
      throw err;
    }

    const copyName = customName?.trim() || `${source.name} (Copy ${Date.now().toString().slice(-4)})`;

    return this.createTemplate({
      name: copyName,
      description: source.description || undefined,
      components: source.components.map((c) => ({
        componentId: c.componentId,
        calculationType: c.calculationType,
        value: c.value,
        formula: c.formula || undefined,
      })),
    });
  }

  static async deleteTemplate(id: string) {
    const existing = await prisma.salaryTemplate.findUnique({
      where: { id },
      include: { _count: { select: { employeeSalaries: true } } },
    });
    if (!existing) {
      const err: any = new Error('Salary template not found.');
      err.statusCode = 404;
      throw err;
    }

    if (existing._count.employeeSalaries > 0) {
      const deactivated = await prisma.salaryTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        action: 'DEACTIVATED',
        deactivated: true,
        deleted: false,
        template: deactivated,
        message: 'Template is assigned to employees and has been deactivated.',
      };
    }

    await prisma.salaryTemplate.delete({ where: { id } });
    return {
      action: 'DELETED',
      deleted: true,
      deactivated: false,
      message: 'Salary template deleted permanently.',
    };
  }

  /**
   * Computes monthly component breakdown for a given monthlyGross and optional templateId.
   */
  static async computeComponentsForGross(monthlyGross: number, templateId?: string) {
    const gross = Math.round(Number(monthlyGross));

    if (templateId) {
      const template = await prisma.salaryTemplate.findUnique({
        where: { id: templateId },
        include: { components: { include: { component: true } } },
      });

      if (template && template.components.length > 0) {
        // Determine Basic first
        const basicRule = template.components.find((tc) => tc.component.code === 'BASIC');
        let basic = Math.round(gross * 0.5);
        if (basicRule) {
          if (basicRule.calculationType === CalculationType.PERCENTAGE && basicRule.value > 0) {
            basic = Math.round(gross * (basicRule.value / 100));
          } else if (basicRule.calculationType === CalculationType.FIXED && basicRule.value > 0) {
            basic = Math.round(basicRule.value);
          }
        }

        const result: Array<{
          code: string;
          name: string;
          type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
          amount: number;
        }> = [];

        let hasSpecialPlaceholder = false;
        let specialName = 'Special Allowance';

        for (const tc of template.components) {
          const code = tc.component.code;
          const name = tc.component.name;
          const type = tc.component.type;

          if (code === 'BASIC') {
            result.push({ code, name, type, amount: basic });
            continue;
          }

          if (code === 'SPL_ALLOW' && tc.value === 0) {
            hasSpecialPlaceholder = true;
            specialName = name;
            continue;
          }

          let amount = 0;
          if (tc.calculationType === CalculationType.FIXED) {
            amount = Math.round(tc.value);
          } else if (tc.calculationType === CalculationType.PERCENTAGE) {
            if (code === 'HRA') {
              amount = Math.round(basic * (tc.value / 100));
            } else if (code.startsWith('PF')) {
              amount = Math.min(1800, Math.round(basic * (tc.value / 100)));
            } else {
              amount = Math.round(gross * (tc.value / 100));
            }
          }

          result.push({ code, name, type, amount });
        }

        // Ensure BASIC exists
        if (!result.some((r) => r.code === 'BASIC')) {
          result.unshift({ code: 'BASIC', name: 'Basic Salary', type: 'EARNING', amount: basic });
        }

        // Balance earnings with Special Allowance so total earnings match monthlyGross
        const currentEarnings = result
          .filter((r) => r.type === 'EARNING')
          .reduce((sum, r) => sum + r.amount, 0);

        if (hasSpecialPlaceholder || currentEarnings < gross) {
          const balancing = Math.max(0, gross - currentEarnings);
          const existingSpl = result.find((r) => r.code === 'SPL_ALLOW');
          if (existingSpl) {
            existingSpl.amount += balancing;
          } else {
            result.push({
              code: 'SPL_ALLOW',
              name: specialName,
              type: 'EARNING',
              amount: balancing,
            });
          }
        }

        // Ensure statutory deductions exist if not already defined in template
        if (!result.some((r) => r.code === 'PF_EE')) {
          result.push({
            code: 'PF_EE',
            name: 'Provident Fund (Employee)',
            type: 'DEDUCTION',
            amount: Math.min(1800, Math.round(basic * 0.12)),
          });
        }
        if (!result.some((r) => r.code === 'PT')) {
          const pt = gross > 20000 ? 200 : gross > 15000 ? 150 : 0;
          result.push({
            code: 'PT',
            name: 'Professional Tax',
            type: 'DEDUCTION',
            amount: pt,
          });
        }
        if (!result.some((r) => r.code === 'TDS')) {
          const tds = gross > 75000 ? Math.round((gross - 75000) * 0.1) : 0;
          result.push({
            code: 'TDS',
            name: 'Income Tax (TDS)',
            type: 'DEDUCTION',
            amount: tds,
          });
        }

        return result;
      }
    }

    // Default standard Indian payroll breakdown
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const conveyance = gross >= 10000 ? 1600 : 0;
    const special = Math.max(0, gross - basic - hra - conveyance);
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = gross > 20000 ? 200 : gross > 15000 ? 150 : 0;
    const tds = gross > 75000 ? Math.round((gross - 75000) * 0.1) : 0;

    return [
      { code: 'BASIC', name: 'Basic Salary', type: 'EARNING' as const, amount: basic },
      { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING' as const, amount: hra },
      ...(conveyance > 0
        ? [{ code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING' as const, amount: conveyance }]
        : []),
      { code: 'SPL_ALLOW', name: 'Special Allowance', type: 'EARNING' as const, amount: special },
      { code: 'PF_EE', name: 'Provident Fund (Employee)', type: 'DEDUCTION' as const, amount: pf },
      { code: 'PT', name: 'Professional Tax', type: 'DEDUCTION' as const, amount: pt },
      { code: 'TDS', name: 'Income Tax (TDS)', type: 'DEDUCTION' as const, amount: tds },
    ];
  }

  // --- Assign Salary to Single Employee ---
  static async assignSalary(data: {
    employeeId: string;
    monthlyGross: number;
    annualCtc?: number;
    templateId?: string;
    components?: Array<{
      code: string;
      name: string;
      type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
      amount: number;
    }>;
    effectiveFrom?: string | Date;
  }) {
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      const err: any = new Error('Employee not found.');
      err.statusCode = 404;
      throw err;
    }

    const monthlyGross = Math.round(Number(data.monthlyGross));
    if (!monthlyGross || monthlyGross <= 0) {
      const err: any = new Error('Monthly gross salary must be greater than zero.');
      err.statusCode = 400;
      throw err;
    }

    const annualCtc = data.annualCtc ? Math.round(Number(data.annualCtc)) : monthlyGross * 12;

    let componentsToStore = data.components;
    if (!componentsToStore || componentsToStore.length === 0) {
      componentsToStore = await this.computeComponentsForGross(monthlyGross, data.templateId);
    }

    return prisma.employeeSalary.upsert({
      where: { employeeId: data.employeeId },
      update: {
        templateId: data.templateId || null,
        monthlyGross,
        ctcAnnual: annualCtc,
        componentsJson: componentsToStore,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
      },
      create: {
        employeeId: data.employeeId,
        templateId: data.templateId || null,
        monthlyGross,
        ctcAnnual: annualCtc,
        componentsJson: componentsToStore,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
      },
      include: {
        template: { select: { id: true, name: true } },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // --- Bulk Assign Salary to Multiple Employees ---
  static async bulkAssignSalary(data: {
    employeeIds: string[];
    monthlyGross: number;
    annualCtc?: number;
    templateId?: string;
    effectiveFrom?: string | Date;
    components?: Array<{
      code: string;
      name: string;
      type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
      amount: number;
    }>;
  }) {
    if (!Array.isArray(data.employeeIds) || data.employeeIds.length === 0) {
      const err: any = new Error('Please select at least one employee for bulk salary assignment.');
      err.statusCode = 400;
      throw err;
    }

    const monthlyGross = Math.round(Number(data.monthlyGross));
    if (!monthlyGross || monthlyGross <= 0) {
      const err: any = new Error('Monthly gross salary must be greater than zero.');
      err.statusCode = 400;
      throw err;
    }

    if (data.templateId) {
      const tpl = await prisma.salaryTemplate.findUnique({ where: { id: data.templateId } });
      if (!tpl || !tpl.isActive) {
        const err: any = new Error('Selected salary template does not exist or is inactive.');
        err.statusCode = 400;
        throw err;
      }
    }

    const annualCtc = data.annualCtc ? Math.round(Number(data.annualCtc)) : monthlyGross * 12;
    const effectiveDate = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
    const uniqueEmpIds = Array.from(new Set(data.employeeIds));

    const componentsToStore =
      data.components && data.components.length > 0
        ? data.components
        : await this.computeComponentsForGross(monthlyGross, data.templateId);

    const results: Array<{
      employeeId: string;
      employeeCode?: string;
      name?: string;
      status: 'ASSIGNED' | 'UPDATED' | 'FAILED';
      monthlyGross?: number;
      ctcAnnual?: number;
      reason?: string;
    }> = [];

    let assignedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (const empId of uniqueEmpIds) {
      const emp = await prisma.employee.findFirst({
        where: { OR: [{ id: empId }, { employeeId: empId }] },
        include: { salary: true },
      });

      if (!emp) {
        failedCount++;
        results.push({
          employeeId: empId,
          status: 'FAILED',
          reason: 'Employee not found',
        });
        continue;
      }

      if (emp.status === EmploymentStatus.EXITED) {
        failedCount++;
        results.push({
          employeeId: emp.id,
          employeeCode: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          status: 'FAILED',
          reason: 'Cannot assign salary to an EXITED employee',
        });
        continue;
      }

      const wasExisting = Boolean(emp.salary);

      await prisma.employeeSalary.upsert({
        where: { employeeId: emp.id },
        update: {
          templateId: data.templateId || null,
          monthlyGross,
          ctcAnnual: annualCtc,
          componentsJson: componentsToStore,
          effectiveFrom: effectiveDate,
        },
        create: {
          employeeId: emp.id,
          templateId: data.templateId || null,
          monthlyGross,
          ctcAnnual: annualCtc,
          componentsJson: componentsToStore,
          effectiveFrom: effectiveDate,
        },
      });

      if (wasExisting) {
        updatedCount++;
      } else {
        assignedCount++;
      }

      results.push({
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        status: wasExisting ? 'UPDATED' : 'ASSIGNED',
        monthlyGross,
        ctcAnnual: annualCtc,
      });
    }

    return {
      totalRequested: uniqueEmpIds.length,
      totalSelected: uniqueEmpIds.length,
      assignedCount,
      updatedCount,
      successfulCount: assignedCount + updatedCount,
      successCount: assignedCount + updatedCount,
      failedCount,
      monthlyGross,
      ctcAnnual: annualCtc,
      components: componentsToStore,
      results,
    };
  }

  static async listAssignments() {
    return prisma.employeeSalary.findMany({
      include: {
        template: { select: { id: true, name: true } },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            status: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  static async getEmployeeSalary(employeeId: string) {
    const record = await prisma.employeeSalary.findFirst({
      where: {
        OR: [{ employeeId }, { employee: { employeeId } }],
      },
      include: {
        template: {
          include: { components: { include: { component: true } } },
        },
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
      },
    });
    if (!record) {
      const err: any = new Error('Salary assignment not found for this employee.');
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  static async deleteEmployeeSalary(employeeId: string) {
    const existing = await prisma.employeeSalary.findFirst({
      where: { OR: [{ employeeId }, { employee: { employeeId } }] },
    });
    if (!existing) {
      const err: any = new Error('Salary assignment not found for this employee.');
      err.statusCode = 404;
      throw err;
    }

    await prisma.employeeSalary.delete({ where: { id: existing.id } });
    return { message: 'Employee salary assignment removed successfully.' };
  }
}
