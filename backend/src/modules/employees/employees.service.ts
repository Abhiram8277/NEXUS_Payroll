import { prisma } from '../../config/prisma';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { EmploymentStatus, Role, TaxRegime, DocumentType } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { config } from '../../config';

export class EmployeesService {
  static async listEmployees(params: {
    search?: string;
    departmentId?: string;
    designationId?: string;
    locationId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(params.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { employeeId: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.designationId) where.designationId = params.designationId;
    if (params.locationId) where.locationId = params.locationId;
    if (params.status) where.status = params.status as EmploymentStatus;

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, city: true } },
          salary: {
            select: {
              id: true,
              templateId: true,
              monthlyGross: true,
              ctcAnnual: true,
              effectiveFrom: true,
              template: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getEmployeeById(id: string) {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeId: id }],
      },
      include: {
        department: true,
        designation: true,
        location: true,
        manager: {
          select: { id: true, employeeId: true, firstName: true, lastName: true },
        },
        salary: {
          include: {
            template: { select: { id: true, name: true } },
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
          },
        },
        leaveBalances: {
          where: { year: new Date().getFullYear() },
          include: { leaveType: true },
        },
      },
    });

    if (!employee) {
      const err: any = new Error('Employee not found');
      err.statusCode = 404;
      throw err;
    }
    return employee;
  }

  static async createEmployee(data: any) {
    let createdNewUserId: string | null = null;
    const tempPass = data.password || 'Nexus@12345';

    const employee = await prisma.$transaction(async (tx) => {
      // Check duplicate employeeId or email
      const existingId = await tx.employee.findUnique({ where: { employeeId: data.employeeId } });
      if (existingId) throw new Error(`Employee ID ${data.employeeId} already exists.`);

      const existingEmail = await tx.employee.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existingEmail) throw new Error(`Email ${data.email} is already in use.`);

      let userId: string | undefined = undefined;

      // Create linked user account if requested
      if (data.createUserAccount !== false) {
        const existingUser = await tx.user.findUnique({ where: { email: data.email.toLowerCase() } });
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const passwordHash = await bcrypt.hash(tempPass, 10);
          const newUser = await tx.user.create({
            data: {
              name: `${data.firstName} ${data.lastName}`,
              email: data.email.toLowerCase(),
              passwordHash,
              role: Role.EMPLOYEE,
              isActive: data.status !== 'EXITED',
            },
          });
          userId = newUser.id;
          createdNewUserId = newUser.id;
        }
      }

      const emp = await tx.employee.create({
        data: {
          employeeId: data.employeeId.trim(),
          userId,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.toLowerCase().trim(),
          phone: data.phone,
          gender: data.gender,
          dob: data.dob ? new Date(data.dob) : null,
          address: data.address,
          pan: data.pan?.toUpperCase(),
          aadhaar: data.aadhaar,
          uan: data.uan,
          esiNumber: data.esiNumber,
          accountNumber: data.accountNumber,
          ifsc: data.ifsc?.toUpperCase(),
          bankName: data.bankName,
          accountHolderName: data.accountHolderName || `${data.firstName} ${data.lastName}`,
          departmentId: data.departmentId || null,
          designationId: data.designationId || null,
          locationId: data.locationId || null,
          managerId: data.managerId || null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          status: (data.status as EmploymentStatus) || EmploymentStatus.ACTIVE,
          taxRegime: (data.taxRegime as TaxRegime) || TaxRegime.NEW,
        },
      });

      // Auto-assign leave balances for active leave types
      const leaveTypes = await tx.leaveType.findMany({ where: { isActive: true } });
      const currentYear = new Date().getFullYear();
      for (const lt of leaveTypes) {
        await tx.leaveBalance.create({
          data: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
            allocated: lt.annualAllocation,
            used: 0,
            pending: 0,
            available: lt.annualAllocation,
          },
        });
      }

      return emp;
    });

    // Send Welcome & Account Activation Email
    if (createdNewUserId) {
      await AuthService.createAndSendActivationInvite(createdNewUserId, tempPass).catch(() => {});
    }

    return employee;
  }

  static async updateEmployee(id: string, data: any) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new Error('Employee not found.');

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        phone: data.phone,
        gender: data.gender,
        dob: data.dob ? new Date(data.dob) : undefined,
        address: data.address,
        pan: data.pan?.toUpperCase(),
        aadhaar: data.aadhaar,
        uan: data.uan,
        esiNumber: data.esiNumber,
        accountNumber: data.accountNumber,
        ifsc: data.ifsc?.toUpperCase(),
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        departmentId: data.departmentId,
        designationId: data.designationId,
        locationId: data.locationId,
        managerId: data.managerId,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
        exitDate: data.exitDate ? new Date(data.exitDate) : undefined,
        status: data.status,
        taxRegime: data.taxRegime,
      },
    });

    // Update user active status if status changed to EXITED
    if (updated.userId && data.status) {
      await prisma.user.update({
        where: { id: updated.userId },
        data: { isActive: data.status !== 'EXITED' },
      });
    }

    return updated;
  }

  static async deleteEmployee(id: string) {
    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { _count: { select: { payrollEmployees: true, payslips: true } } },
    });

    if (!existing) {
      const err: any = new Error('Employee not found.');
      err.statusCode = 404;
      throw err;
    }

    // If employee has historical payroll runs/payslips, soft-deactivate to preserve audit history
    if (existing._count.payrollEmployees > 0 || existing._count.payslips > 0) {
      const updated = await prisma.employee.update({
        where: { id },
        data: {
          status: EmploymentStatus.EXITED,
          exitDate: existing.exitDate || new Date(),
        },
      });
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { isActive: false },
        });
      }
      return {
        action: 'DEACTIVATED',
        deactivated: true,
        deleted: false,
        employee: updated,
        message: 'Employee has historical payroll records and has been deactivated (EXITED) to preserve payroll history.',
      };
    }

    // Otherwise hard-delete the employee and linked EMPLOYEE user account
    await prisma.employee.delete({ where: { id } });
    if (existing.userId) {
      const user = await prisma.user.findUnique({ where: { id: existing.userId } });
      if (user && user.role === Role.EMPLOYEE) {
        await prisma.user.delete({ where: { id: existing.userId } });
      }
    }

    return {
      action: 'DELETED',
      deleted: true,
      deactivated: false,
      message: 'Employee deleted permanently.',
    };
  }

  static async addDocument(employeeId: string, file: Express.Multer.File, documentType: DocumentType) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new Error('Employee not found');

    return prisma.employeeDocument.create({
      data: {
        employeeId,
        documentType: documentType || DocumentType.OTHER,
        fileName: file.originalname,
        filePath: file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  static async getDocument(docId: string) {
    const doc = await prisma.employeeDocument.findUnique({
      where: { id: docId },
      include: { employee: true },
    });
    if (!doc) throw new Error('Document not found');
    return doc;
  }

  static async deleteDocument(docId: string) {
    const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
    if (!doc) {
      const err: any = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }

    const fullPath = path.join(config.uploadDir, doc.filePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Ignore fs unlink error if file was already removed
      }
    }

    await prisma.employeeDocument.delete({ where: { id: docId } });
    return { message: 'Document deleted successfully.' };
  }
}
