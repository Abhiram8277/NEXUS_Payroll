import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { config } from '../../config';

export class AuthService {
  static async login(identifier: string, password: string) {
    const cleanId = identifier.trim().toLowerCase();

    // Support login by email OR by Employee ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId },
          { employee: { employeeId: { equals: identifier.trim(), mode: 'insensitive' } } },
        ],
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Invalid credentials provided.');
    }

    if (!user.isActive) {
      const err: any = new Error('Your account is currently inactive. Please contact HR or Administrator.');
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials provided.');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id,
        empCode: user.employee?.employeeId,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employee: user.employee,
      },
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        employee: {
          include: {
            department: true,
            designation: true,
            location: true,
            salary: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    return user;
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return safe message without exposing whether user exists
      return { message: 'If this email is registered, password reset instructions have been recorded.' };
    }

    return {
      message: 'Password reset link simulated for developer test.',
      resetToken: jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '1h' }),
    };
  }

  static async resetPassword(email: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('User not found with this email.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { message: 'Password reset successfully.' };
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new Error('Current password is incorrect.');

    const passwordHash = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully.' };
  }
}
