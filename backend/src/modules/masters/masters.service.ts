import { prisma } from '../../config/prisma';

export class MastersService {
  // --- Departments ---
  static async getDepartments(includeInactive = false) {
    return prisma.department.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  static async createDepartment(data: { name: string; code: string; description?: string }) {
    return prisma.department.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description,
      },
    });
  }

  static async updateDepartment(id: string, data: any) {
    return prisma.department.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase(),
        description: data.description,
        isActive: data.isActive,
      },
    });
  }

  static async deleteDepartment(id: string) {
    // Check if referenced by employees
    const empCount = await prisma.employee.count({ where: { departmentId: id } });
    if (empCount > 0) {
      // Soft deactivate
      return prisma.department.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.department.delete({ where: { id } });
  }

  // --- Designations ---
  static async getDesignations(includeInactive = false) {
    return prisma.designation.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  static async createDesignation(data: { name: string; code: string; description?: string }) {
    return prisma.designation.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description,
      },
    });
  }

  static async updateDesignation(id: string, data: any) {
    return prisma.designation.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase(),
        description: data.description,
        isActive: data.isActive,
      },
    });
  }

  static async deleteDesignation(id: string) {
    const empCount = await prisma.employee.count({ where: { designationId: id } });
    if (empCount > 0) {
      return prisma.designation.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.designation.delete({ where: { id } });
  }

  // --- Locations ---
  static async getLocations(includeInactive = false) {
    return prisma.location.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  static async createLocation(data: any) {
    return prisma.location.create({ data });
  }

  static async updateLocation(id: string, data: any) {
    return prisma.location.update({ where: { id }, data });
  }

  static async deleteLocation(id: string) {
    const empCount = await prisma.employee.count({ where: { locationId: id } });
    if (empCount > 0) {
      return prisma.location.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.location.delete({ where: { id } });
  }

  // --- Leave Types ---
  static async getLeaveTypes(includeInactive = false) {
    return prisma.leaveType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  static async createLeaveType(data: any) {
    return prisma.leaveType.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        annualAllocation: parseFloat(data.annualAllocation) || 0,
        carryForwardAllowed: Boolean(data.carryForwardAllowed),
        maxCarryForward: parseFloat(data.maxCarryForward) || 0,
        isPaid: Boolean(data.isPaid),
        requiresApproval: data.requiresApproval !== undefined ? Boolean(data.requiresApproval) : true,
      },
    });
  }

  static async updateLeaveType(id: string, data: any) {
    return prisma.leaveType.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase(),
        annualAllocation: data.annualAllocation !== undefined ? parseFloat(data.annualAllocation) : undefined,
        carryForwardAllowed: data.carryForwardAllowed !== undefined ? Boolean(data.carryForwardAllowed) : undefined,
        maxCarryForward: data.maxCarryForward !== undefined ? parseFloat(data.maxCarryForward) : undefined,
        isPaid: data.isPaid !== undefined ? Boolean(data.isPaid) : undefined,
        requiresApproval: data.requiresApproval !== undefined ? Boolean(data.requiresApproval) : undefined,
        isActive: data.isActive,
      },
    });
  }

  static async deleteLeaveType(id: string) {
    const reqCount = await prisma.leaveRequest.count({ where: { leaveTypeId: id } });
    if (reqCount > 0) {
      return prisma.leaveType.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.leaveType.delete({ where: { id } });
  }

  // --- Salary Components ---
  static async getSalaryComponents(includeInactive = false) {
    return prisma.salaryComponent.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  static async createSalaryComponent(data: any) {
    return prisma.salaryComponent.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        type: data.type,
        calculationType: data.calculationType || 'FIXED',
        value: parseFloat(data.value) || 0,
        description: data.description,
      },
    });
  }

  static async updateSalaryComponent(id: string, data: any) {
    return prisma.salaryComponent.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase(),
        type: data.type,
        calculationType: data.calculationType,
        value: data.value !== undefined ? parseFloat(data.value) : undefined,
        description: data.description,
        isActive: data.isActive,
      },
    });
  }

  static async deleteSalaryComponent(id: string) {
    const tplCount = await prisma.salaryTemplateComponent.count({ where: { componentId: id } });
    if (tplCount > 0) {
      return prisma.salaryComponent.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.salaryComponent.delete({ where: { id } });
  }

  // --- Holidays ---
  static async getHolidays(year?: number) {
    let where: any = undefined;
    if (year) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31`);
      where = { date: { gte: start, lte: end } };
    }
    return prisma.holiday.findMany({
      where,
      include: { location: true },
      orderBy: { date: 'asc' },
    });
  }

  static async createHoliday(data: any) {
    return prisma.holiday.create({
      data: {
        name: data.name.trim(),
        date: new Date(data.date),
        description: data.description,
        locationId: data.locationId || null,
      },
    });
  }

  static async updateHoliday(id: string, data: any) {
    return prisma.holiday.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        date: data.date ? new Date(data.date) : undefined,
        description: data.description,
        locationId: data.locationId !== undefined ? (data.locationId || null) : undefined,
      },
    });
  }

  static async deleteHoliday(id: string) {
    return prisma.holiday.delete({ where: { id } });
  }
}
