import { prisma } from '../../config/prisma';
import { CalculationType, ComponentType } from '@prisma/client';

export class SalaryService {
  // --- Templates ---
  static async listTemplates() {
    return prisma.salaryTemplate.findMany({
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
      },
    });
    if (!template) throw new Error('Salary template not found.');
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
    return prisma.$transaction(async (tx) => {
      const template = await tx.salaryTemplate.create({
        data: {
          name: data.name.trim(),
          description: data.description,
        },
      });

      if (data.components && data.components.length > 0) {
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
      }

      return tx.salaryTemplate.findUnique({
        where: { id: template.id },
        include: { components: { include: { component: true } } },
      });
    });
  }

  static async updateTemplate(id: string, data: any) {
    return prisma.$transaction(async (tx) => {
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
        include: { components: { include: { component: true } } },
      });
    });
  }

  // --- Assign Salary to Employee ---
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
    if (!employee) throw new Error('Employee not found.');

    const monthlyGross = Math.round(Number(data.monthlyGross));
    const annualCtc = data.annualCtc ? Math.round(Number(data.annualCtc)) : monthlyGross * 12;

    let componentsToStore = data.components;

    // If components not provided, auto-calculate standard Indian breakdown
    if (!componentsToStore || componentsToStore.length === 0) {
      const basic = Math.round(monthlyGross * 0.5); // 50% Basic
      const hra = Math.round(basic * 0.4);           // 40% HRA
      const conveyance = 1600;
      const special = Math.max(0, monthlyGross - basic - hra - conveyance);
      const pf = Math.min(1800, Math.round(basic * 0.12));
      const pt = monthlyGross > 20000 ? 200 : monthlyGross > 15000 ? 150 : 0;
      const tds = monthlyGross > 75000 ? Math.round((monthlyGross - 75000) * 0.1) : 0;

      componentsToStore = [
        { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', amount: basic },
        { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', amount: hra },
        { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING', amount: conveyance },
        { code: 'SPL_ALLOW', name: 'Special Allowance', type: 'EARNING', amount: special },
        { code: 'PF_EE', name: 'Provident Fund (Employee)', type: 'DEDUCTION', amount: pf },
        { code: 'PT', name: 'Professional Tax', type: 'DEDUCTION', amount: pt },
        { code: 'TDS', name: 'Income Tax (TDS)', type: 'DEDUCTION', amount: tds },
      ];
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
    });
  }

  static async getEmployeeSalary(employeeId: string) {
    const record = await prisma.employeeSalary.findUnique({
      where: { employeeId },
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
    if (!record) throw new Error('Salary assignment not found for this employee.');
    return record;
  }
}
