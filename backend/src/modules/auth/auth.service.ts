import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { config } from '../../config';
import { EmailService } from '../email/email.service';

export class AuthService {
  private static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

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
      const err: any = new Error('Invalid credentials provided.');
      err.statusCode = 401;
      throw err;
    }

    if (!user.isActive) {
      const err: any = new Error('Your account is currently inactive. Please contact HR or Administrator.');
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Invalid credentials provided.');
      err.statusCode = 401;
      throw err;
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

  /**
   * Generates a single-use hashed password reset token, stores it in UserToken,
   * and sends a password reset email via EmailService.
   * Never leaks whether the email exists in the HTTP response.
   */
  static async forgotPassword(email: string, expiresInMinutes = 30) {
    const cleanEmail = email.trim().toLowerCase();
    const genericMessage = 'If an account with that email exists, password reset instructions have been sent.';

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.isActive) {
      return { message: genericMessage };
    }

    // Invalidate any prior unused PASSWORD_RESET tokens for this user
    await prisma.userToken.updateMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await prisma.userToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    await EmailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken: rawToken,
    });

    return { message: genericMessage };
  }

  /**
   * Resets user password using a valid, non-expired, single-use token.
   */
  static async resetPassword(rawToken: string, newPassword: string, email?: string) {
    const tokenHash = this.hashToken(rawToken.trim());

    const tokenRecord = await prisma.userToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.type !== 'PASSWORD_RESET') {
      const err: any = new Error('Invalid password reset token.');
      err.statusCode = 400;
      throw err;
    }

    if (email && tokenRecord.user.email.toLowerCase() !== email.trim().toLowerCase()) {
      const err: any = new Error('Invalid password reset token for this email address.');
      err.statusCode = 400;
      throw err;
    }

    if (tokenRecord.usedAt !== null) {
      const err: any = new Error('This password reset token has already been used.');
      err.statusCode = 400;
      throw err;
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      const err: any = new Error('Password reset token has expired.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      prisma.userToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await EmailService.sendPasswordResetConfirmationEmail({
      to: tokenRecord.user.email,
      name: tokenRecord.user.name,
    });

    return { message: 'Password has been reset successfully. You can now log in with your new password.' };
  }

  /**
   * Creates an account activation token and sends welcome/invitation email.
   */
  static async createAndSendActivationInvite(userId: string, tempPassword?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await prisma.userToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'ACCOUNT_ACTIVATION',
        expiresAt,
      },
    });

    const emailLog = await EmailService.sendWelcomeActivationEmail({
      to: user.email,
      name: user.name,
      role: user.role,
      activationToken: rawToken,
      tempPassword,
    });

    return { activationToken: rawToken, emailLog };
  }

  /**
   * Activates a user account with a single-use activation token and sets their password.
   */
  static async activateAccount(rawToken: string, newPassword: string) {
    const tokenHash = this.hashToken(rawToken.trim());

    const tokenRecord = await prisma.userToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.type !== 'ACCOUNT_ACTIVATION') {
      const err: any = new Error('Invalid account activation token.');
      err.statusCode = 400;
      throw err;
    }

    if (tokenRecord.usedAt !== null) {
      const err: any = new Error('This account activation token has already been used.');
      err.statusCode = 400;
      throw err;
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      const err: any = new Error('Account activation token has expired.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash, isActive: true },
      }),
      prisma.userToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      message: 'Account activated and password set successfully.',
      email: tokenRecord.user.email,
    };
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Current password is incorrect.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await EmailService.sendPasswordResetConfirmationEmail({
      to: user.email,
      name: user.name,
    });

    return { message: 'Password updated successfully.' };
  }
}
