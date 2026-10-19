import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { EmailService } from '../email/email.service';

export class UsersService {
  static async listUsers(params: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.role) {
      where.role = params.role as Role;
    }

    if (params.status === 'ACTIVE') {
      where.isActive = true;
    } else if (params.status === 'INACTIVE') {
      where.isActive = false;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { employee: { employeeId: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              status: true,
              department: { select: { id: true, name: true, code: true } },
              designation: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
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

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    if (!user) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    return user;
  }

  static async createUser(
    data: {
      name: string;
      email: string;
      password: string;
      role: 'ADMIN' | 'HR';
      isActive?: boolean;
    },
    creatorUserId?: string
  ) {
    const { name, email, password, role } = data;

    if (!name?.trim() || !email?.trim() || !password) {
      const err: any = new Error('Name, email, and password are required.');
      err.statusCode = 400;
      throw err;
    }

    if (role !== 'ADMIN' && role !== 'HR') {
      const err: any = new Error('Direct staff creation only allows ADMIN or HR roles.');
      err.statusCode = 400;
      throw err;
    }

    if (password.length < 8) {
      const err: any = new Error('Password must be at least 8 characters long.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      const err: any = new Error(`An account with email ${cleanEmail} already exists.`);
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: role as Role,
        isActive: data.isActive !== false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Optionally notify via email log
    try {
      await EmailService.sendWelcomeActivationEmail({
        to: newUser.email,
        name: newUser.name,
        role: newUser.role,
        activationToken: 'direct_setup',
        tempPassword: password,
      });
    } catch (e) {
      // Email failure should not block user creation
    }

    return newUser;
  }

  static async updateUser(
    id: string,
    data: {
      name?: string;
      role?: Role;
      isActive?: boolean;
    },
    currentUserId: string
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    if (id === currentUserId) {
      if (data.isActive === false) {
        const err: any = new Error('You cannot deactivate your own account.');
        err.statusCode = 400;
        throw err;
      }
      if (data.role && data.role !== 'ADMIN') {
        const err: any = new Error('You cannot demote your own administrator privileges.');
        err.statusCode = 400;
        throw err;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        role: data.role || undefined,
        isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async deleteUser(id: string, currentUserId: string) {
    if (id === currentUserId) {
      const err: any = new Error('You cannot delete your own account.');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            payslips: { take: 1 },
          },
        },
      },
    });

    if (!user) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (adminCount <= 1) {
        const err: any = new Error('Cannot delete or deactivate the last remaining administrator account.');
        err.statusCode = 400;
        throw err;
      }
    }

    // Check if user has associated payslips or active employee records
    if (user.employee && user.employee.payslips.length > 0) {
      // Soft-deactivate to preserve historical integrity
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'User account has payroll history. Account has been deactivated instead of deleted.' };
    }

    // Delete cleanly
    await prisma.user.delete({ where: { id } });
    return { message: 'User account deleted successfully.' };
  }

  static async resetPassword(id: string, newPass: string) {
    if (!newPass || newPass.length < 8) {
      const err: any = new Error('Password must be at least 8 characters long.');
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Invalidate active reset tokens
    await prisma.userToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    });

    return { message: `Password reset successfully for ${user.email}.` };
  }
}
