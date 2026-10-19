import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { config } from '../../config';
import { EmailService } from '../email/email.service';

export class AuthService {
  private static getFrontendUrl(): string {
    return config.frontendUrl || 'http://localhost:5173';
  }

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

    const emailLog = await EmailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken: rawToken,
    });

    const isSimulated = (emailLog.metadata as any)?.delivery?.mode === 'SIMULATED';

    return {
      message: genericMessage,
      ...(process.env.NODE_ENV !== 'production' && isSimulated
        ? {
            devNotice: 'SMTP is not configured in .env. Password reset token generated in simulated mode.',
            devToken: rawToken,
            devResetLink: `${this.getFrontendUrl()}/login?mode=reset&token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}`,
          }
        : {}),
    };
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

  /**
   * Returns whether the system has been initialized with at least one ADMIN account
   * and an organization profile.
   */
  static async getSystemStatus() {
    const [adminCount, userCount, company, firstAdmin] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count(),
      prisma.company.findFirst(),
      prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { email: true, name: true } }),
    ]);

    return {
      isInitialized: adminCount > 0 && !!company,
      hasAdmin: adminCount > 0,
      adminEmail: firstAdmin?.email || null,
      adminName: firstAdmin?.name || null,
      userCount,
      company: company
        ? {
            id: company.id,
            name: company.name,
            tagline: company.tagline,
            email: company.email,
            phone: company.phone,
            financialYear: company.financialYear,
          }
        : null,
    };
  }

  /**
   * Initial Setup: Creates the Master Organization profile and first ADMIN user.
   * Only allowed when no ADMIN user currently exists in the system.
   */
  static async setupAdmin(data: {
    companyName: string;
    companyTagline?: string;
    companyEmail?: string;
    companyPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount > 0) {
      const err: any = new Error('System is already configured with an administrator. Please sign in.');
      err.statusCode = 400;
      throw err;
    }

    const { adminName, adminEmail, adminPassword, companyName } = data;
    if (!adminName?.trim() || !adminEmail?.trim() || !adminPassword || !companyName?.trim()) {
      const err: any = new Error('Company name, administrator name, email, and password are required.');
      err.statusCode = 400;
      throw err;
    }

    if (adminPassword.length < 8) {
      const err: any = new Error('Password must be at least 8 characters.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = adminEmail.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      const err: any = new Error('An account with this email address already exists.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert or create Company
      const existingCompany = await tx.company.findFirst();
      let company;
      if (existingCompany) {
        company = await tx.company.update({
          where: { id: existingCompany.id },
          data: {
            name: companyName.trim(),
            tagline: data.companyTagline || 'Payroll, without the paperwork.',
            email: data.companyEmail || cleanEmail,
            phone: data.companyPhone,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            pinCode: data.pinCode,
          },
        });
      } else {
        company = await tx.company.create({
          data: {
            name: companyName.trim(),
            tagline: data.companyTagline || 'Payroll, without the paperwork.',
            email: data.companyEmail || cleanEmail,
            phone: data.companyPhone,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            pinCode: data.pinCode,
            financialYear: '2026-2027',
            payrollFrequency: 'MONTHLY',
          },
        });
      }

      // 2. Create the Primary Master Admin User
      const adminUser = await tx.user.create({
        data: {
          name: adminName.trim(),
          email: cleanEmail,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      // 3. Ensure fundamental statutory components exist so statutory payroll operates immediately
      const compCount = await tx.salaryComponent.count();
      if (compCount === 0) {
        await tx.salaryComponent.createMany({
          data: [
            { name: 'Basic Salary', code: 'BASIC', type: 'EARNING', calculationType: 'FIXED', value: 0, isActive: true },
            { name: 'House Rent Allowance', code: 'HRA', type: 'EARNING', calculationType: 'FIXED', value: 0, isActive: true },
            { name: 'Special Allowance', code: 'SPL_ALLOW', type: 'EARNING', calculationType: 'FIXED', value: 0, isActive: true },
            { name: 'Conveyance Allowance', code: 'CONVEYANCE', type: 'EARNING', calculationType: 'FIXED', value: 1600, isActive: true },
            { name: 'Provident Fund (Employee)', code: 'PF_EE', type: 'DEDUCTION', calculationType: 'PERCENTAGE', value: 12, isActive: true },
            { name: 'ESI (Employee)', code: 'ESI_EE', type: 'DEDUCTION', calculationType: 'PERCENTAGE', value: 0.75, isActive: true },
            { name: 'Professional Tax', code: 'PT', type: 'DEDUCTION', calculationType: 'FIXED', value: 200, isActive: true },
            { name: 'Provident Fund (Employer)', code: 'PF_ER', type: 'EMPLOYER_CONTRIBUTION', calculationType: 'PERCENTAGE', value: 12, isActive: true },
            { name: 'ESI (Employer)', code: 'ESI_ER', type: 'EMPLOYER_CONTRIBUTION', calculationType: 'PERCENTAGE', value: 3.25, isActive: true },
          ],
        });
      }

      // 4. Default Leave Types
      const leaveCount = await tx.leaveType.count();
      if (leaveCount === 0) {
        await tx.leaveType.createMany({
          data: [
            { name: 'Casual Leave', code: 'CL', annualAllocation: 12, carryForwardAllowed: false, maxCarryForward: 0, isPaid: true, requiresApproval: true, isActive: true },
            { name: 'Sick Leave', code: 'SL', annualAllocation: 10, carryForwardAllowed: false, maxCarryForward: 0, isPaid: true, requiresApproval: true, isActive: true },
            { name: 'Privilege Leave', code: 'PL', annualAllocation: 15, carryForwardAllowed: true, maxCarryForward: 5, isPaid: true, requiresApproval: true, isActive: true },
          ],
        });
      }

      // 5. Starter Departments
      const deptCount = await tx.department.count();
      if (deptCount === 0) {
        await tx.department.createMany({
          data: [
            { name: 'Human Resources', code: 'HR', description: 'People operations & employee lifecycle' },
            { name: 'Technology & Engineering', code: 'TECH', description: 'Product development and tech infrastructure' },
            { name: 'Finance & Accounts', code: 'FIN', description: 'Financial planning and corporate accounting' },
            { name: 'Operations & Sales', code: 'OPS', description: 'Client operations and business development' },
          ],
        });
      }

      // 6. Starter Designations
      const desigCount = await tx.designation.count();
      if (desigCount === 0) {
        await tx.designation.createMany({
          data: [
            { name: 'HR Manager', code: 'HR_MGR', description: 'Human resources leadership' },
            { name: 'HR Executive', code: 'HR_EXEC', description: 'HR operations and onboarding' },
            { name: 'Software Engineer', code: 'SE', description: 'Core application developer' },
            { name: 'Senior Software Engineer', code: 'SR_SE', description: 'Senior engineering specialist' },
            { name: 'Financial Analyst', code: 'FIN_ANALYST', description: 'Finance and accounting operations' },
          ],
        });
      }

      // 7. Starter Location
      const locCount = await tx.location.count();
      if (locCount === 0) {
        await tx.location.create({
          data: {
            name: `${companyName.trim()} Corporate Office`,
            address: data.address || 'Corporate Headquarters',
            city: data.city || 'Hyderabad',
            state: data.state || 'Telangana',
            country: data.country || 'India',
            pinCode: data.pinCode || '500081',
          },
        });
      }

      return { company, adminUser };
    });

    const token = jwt.sign(
      {
        userId: result.adminUser.id,
        email: result.adminUser.email,
        role: result.adminUser.role,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
        role: result.adminUser.role,
      },
      company: result.company,
    };
  }

  /**
   * Resets the entire database so the system can be set up completely clean.
   * Requires exact confirmation token: 'WIPE_ALL_DATA_START_FRESH'
   */
  static async resetDatabase(confirmPhrase: string) {
    if (confirmPhrase !== 'WIPE_ALL_DATA_START_FRESH') {
      const err: any = new Error('Invalid confirmation phrase. Pass confirmation: "WIPE_ALL_DATA_START_FRESH"');
      err.statusCode = 400;
      throw err;
    }

    await prisma.$transaction([
      prisma.payslip.deleteMany(),
      prisma.payrollEmployee.deleteMany(),
      prisma.payrollRun.deleteMany(),
      prisma.attendance.deleteMany(),
      prisma.leaveRequest.deleteMany(),
      prisma.leaveBalance.deleteMany(),
      prisma.employeeDocument.deleteMany(),
      prisma.employeeSalary.deleteMany(),
      prisma.salaryTemplateComponent.deleteMany(),
      prisma.salaryTemplate.deleteMany(),
      prisma.salaryComponent.deleteMany(),
      prisma.employee.deleteMany(),
      prisma.department.deleteMany(),
      prisma.designation.deleteMany(),
      prisma.location.deleteMany(),
      prisma.leaveType.deleteMany(),
      prisma.holiday.deleteMany(),
      prisma.userToken.deleteMany(),
      prisma.emailLog.deleteMany(),
      prisma.user.deleteMany(),
      prisma.company.deleteMany(),
    ]);

    return { message: 'Database reset successfully. You may now initialize the system fresh.' };
  }
}

